package com.eventrush.service;

import com.eventrush.dto.BookingRequestDto;
import com.eventrush.dto.BookingResponseDto;
import com.eventrush.exception.RateLimitExceededException;
import com.eventrush.exception.ResourceNotFoundException;
import com.eventrush.exception.SeatNotAvailableException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import jakarta.annotation.PreDestroy;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Same FAIRNESS job as BookingQueueService, but backed by a Redis List
 * instead of a local BlockingQueue - so the queue is SHARED across
 * every app instance, not private to one.
 *
 * WHY THE OLD VERSION BREAKS AT SCALE: with a local BlockingQueue, if
 * you run 3 app instances behind a load balancer, each instance has
 * its OWN queue and its OWN worker thread for "event 5". Three
 * separate workers, each thinking they're the only one processing
 * event 5's bookings, all racing to grab seats independently. You'd
 * be relying ENTIRELY on the DB lock to save you, and you'd have
 * THREE queues each individually FIFO, but no single "first in,
 * first out" order across all of them combined - fairness breaks.
 *
 * HOW THIS FIXES IT: LPUSH/RPOP on a Redis List are atomic operations
 * on the Redis server. No matter which of your 3 app instances calls
 * RPOP, Redis hands out the OLDEST item in the list, in the exact
 * order it was pushed. So even with 3 separate JVMs, there's ONE
 * true queue and ONE true order.
 *
 * THE HARD PART: request/response across instances.
 * The instance that RECEIVES the HTTP request might not be the same
 * instance whose worker thread PROCESSES it (any instance's worker
 * could pop it). So we can't just hold a Java object reference and
 * wait on it like before. Instead:
 *   1. Submitting instance pushes a task with a unique taskId.
 *   2. Whichever instance's worker pops it, processes it, and pushes
 *      the RESULT to a Redis key named after that taskId.
 *   3. The ORIGINAL submitting instance blocks (with a timeout) on
 *      that same taskId key until the result shows up.
 * This works no matter which instance actually did the processing.
 *
 * TRADE-OFF WORTH KNOWING FOR AN INTERVIEW: this design runs one
 * worker PER INSTANCE per event (not one worker total). So if 3
 * instances are all up, 3 workers could pop from the same event's
 * queue concurrently - meaning 2 requests for the same event COULD
 * be processed at nearly the same moment, on different instances.
 * Redis's atomic RPOP still guarantees no request is processed twice
 * and preserves overall push order into the list, but true "exactly
 * one active worker at a time" would need a distributed lock around
 * the worker itself (e.g. via Redisson) - a good "how would you
 * improve this further" answer to have ready.
 */
@Service
public class RedisBookingQueueService {

    @Autowired private StringRedisTemplate redisTemplate;
    @Autowired private BookingService bookingService;

    // NOT the same ObjectMapper Spring autowires everywhere else - this
    // is a fresh one, so it does NOT get Spring Boot's auto-configured
    // JavaTimeModule for free. BookingResponseDto.createdAt is a
    // LocalDateTime, so without registering the module here explicitly,
    // serializing any SUCCESSFUL booking's result throws
    // InvalidDefinitionException inside processQueue()'s outer catch -
    // which just logs it and moves on, so the result never reaches the
    // response key and the caller sits until its 15s wait times out,
    // even though the booking itself already succeeded in the DB.
    // (Failure results serialize fine since they carry no date field,
    // which is why "already booked" errors returned instantly while
    // every real booking hung.)
    private final ObjectMapper objectMapper = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    private final Map<Long, Boolean> workerStarted = new ConcurrentHashMap<>();
    private final ExecutorService workerPool = Executors.newCachedThreadPool();
    private final ExecutorService waiterPool = Executors.newCachedThreadPool();
    private volatile boolean shuttingDown = false;

    public CompletableFuture<BookingResponseDto> submit(BookingRequestDto request) {
        Long eventId = request.getEventId();
        String taskId = UUID.randomUUID().toString();

        ensureWorkerRunning(eventId);
        pushTask(eventId, taskId, request);

        // Block on the RESULT key in a background thread, so the
        // caller (the controller) still gets a normal CompletableFuture
        // to .get() with a timeout, same as before.
        return CompletableFuture.supplyAsync(() -> waitForResult(taskId), waiterPool);
    }

    private void pushTask(Long eventId, String taskId, BookingRequestDto request) {
        try {
            String json = objectMapper.writeValueAsString(new TaskEnvelope(taskId, request));
            redisTemplate.opsForList().leftPush(queueKey(eventId), json);
        } catch (Exception e) {
            throw new RuntimeException("Failed to enqueue booking request", e);
        }
    }

    private BookingResponseDto waitForResult(String taskId) {
        // Blocking pop with a timeout - waits for the worker (on ANY
        // instance) to push the result, without busy-polling.
        String result = redisTemplate.opsForList()
                .rightPop(responseKey(taskId), Duration.ofSeconds(15));

        if (result == null) {
            throw new RuntimeException("Booking request timed out - system is under heavy load");
        }

        try {
            ResultEnvelope envelope = objectMapper.readValue(result, ResultEnvelope.class);
            if (envelope.error() != null) {
                throw toException(envelope.error(), envelope.errorMessage());
            }
            return envelope.response();
        } catch (RuntimeException re) {
            throw re;
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse booking result", e);
        }
    }

    private RuntimeException toException(String type, String message) {
        return switch (type) {
            case "SeatNotAvailableException" -> new SeatNotAvailableException(message);
            case "ResourceNotFoundException" -> new ResourceNotFoundException(message);
            case "RateLimitExceededException" -> new RateLimitExceededException(message);
            default -> new RuntimeException(message);
        };
    }

    private void ensureWorkerRunning(Long eventId) {
        // computeIfAbsent is atomic per-instance: guarantees exactly one
        // worker thread per event, PER INSTANCE (see class-level trade-off note).
        workerStarted.computeIfAbsent(eventId, id -> {
            workerPool.submit(() -> processQueue(eventId));
            return true;
        });
    }

    private void processQueue(Long eventId) {
        String key = queueKey(eventId);
        while (!shuttingDown) {
            try {
                // Blocking pop with timeout - this thread sleeps (costs
                // nothing) until either a task arrives or 5s pass, then
                // loops again so it can notice shutdown/interruption.
                String json = redisTemplate.opsForList().rightPop(key, Duration.ofSeconds(5));
                if (json == null) continue;

                TaskEnvelope envelope = objectMapper.readValue(json, TaskEnvelope.class);
                ResultEnvelope result;
                try {
                    BookingResponseDto response = bookingService.bookSeat(envelope.request());
                    result = ResultEnvelope.success(response);
                } catch (Exception e) {
                    result = ResultEnvelope.failure(e.getClass().getSimpleName(), e.getMessage());
                }

                String resultKey = responseKey(envelope.taskId());
                redisTemplate.opsForList().leftPush(resultKey, objectMapper.writeValueAsString(result));
                redisTemplate.expire(resultKey, Duration.ofSeconds(30)); // cleanup if nobody ever collects it

            } catch (Exception e) {
                System.err.println("[QUEUE WORKER][event " + eventId + "] error: " + e.getMessage());
            }
        }
    }

    @PreDestroy
    public void shutdown() {
        shuttingDown = true;
        workerPool.shutdownNow();
        waiterPool.shutdownNow();
    }

    private String queueKey(Long eventId) {
        return "eventrush:queue:" + eventId;
    }

    private String responseKey(String taskId) {
        return "eventrush:response:" + taskId;
    }
}