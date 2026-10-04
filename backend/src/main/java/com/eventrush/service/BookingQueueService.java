package com.eventrush.service;

import com.eventrush.dto.BookingRequestDto;
import com.eventrush.dto.BookingResponseDto;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.*;

/**
 * FAIRNESS layer. This solves a DIFFERENT problem from the pessimistic
 * lock in BookingService.
 *
 * - The lock guarantees CORRECTNESS: no overselling, ever.
 * - This queue guarantees FAIRNESS: whoever's request arrives first
 *   gets processed first, for a given event.
 *
 * Without this queue, if 500 requests hit bookSeat() at once, the DB
 * lock still stops overselling, but WHO wins the lock next is
 * basically random - decided by the OS/DB thread scheduler, not by
 * who actually clicked "Buy" first. At Amazon-style scale, that's not
 * good enough for a "first come first serve" sale.
 *
 * Design: one BlockingQueue + one dedicated worker thread PER EVENT.
 * - Different events run fully in parallel (they don't block each other).
 * - Within the SAME event, requests are handled strictly in the order
 *   they were submitted to the queue (FIFO).
 *
 * Scaling note for interviews: this in-memory queue lives on a single
 * app instance. At real Amazon/Ticketmaster scale, this becomes a
 * distributed queue (Kafka partitioned by eventId, or Redis Streams),
 * so ordering is preserved even across multiple app servers.
 */
@Service
public class BookingQueueService {

    @Autowired
    private BookingService bookingService;

    private final Map<Long, BlockingQueue<BookingTask>> eventQueues = new ConcurrentHashMap<>();
    private final Map<Long, Boolean> workerStarted = new ConcurrentHashMap<>();
    private final ExecutorService workerPool = Executors.newCachedThreadPool();

    public CompletableFuture<BookingResponseDto> submit(BookingRequestDto request) {
        Long eventId = request.getEventId();

        BlockingQueue<BookingTask> queue =
                eventQueues.computeIfAbsent(eventId, id -> new LinkedBlockingQueue<>());

        CompletableFuture<BookingResponseDto> future = new CompletableFuture<>();
        queue.offer(new BookingTask(request, future));

        ensureWorkerRunning(eventId, queue);

        return future;
    }

    private void ensureWorkerRunning(Long eventId, BlockingQueue<BookingTask> queue) {
        // Only ONE worker thread is ever started per event, no matter
        // how many requests come in. computeIfAbsent is atomic, so
        // even under concurrent calls, the worker is started exactly once.
        workerStarted.computeIfAbsent(eventId, id -> {
            workerPool.submit(() -> processQueue(queue));
            return true;
        });
    }

    private void processQueue(BlockingQueue<BookingTask> queue) {
        while (true) {
            try {
                // take() blocks here until a task is available -
                // this thread does nothing (no CPU wasted) while idle.
                BookingTask task = queue.take();
                try {
                    BookingResponseDto response = bookingService.bookSeat(task.request());
                    task.future().complete(response);
                } catch (Exception e) {
                    task.future().completeExceptionally(e);
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            }
        }
    }

    private record BookingTask(BookingRequestDto request, CompletableFuture<BookingResponseDto> future) {}
}
