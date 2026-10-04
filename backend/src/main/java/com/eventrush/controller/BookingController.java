package com.eventrush.controller;

import com.eventrush.dto.BookingRequestDto;
import com.eventrush.dto.BookingResponseDto;
import com.eventrush.exception.RateLimitExceededException;
import com.eventrush.service.RedisBookingQueueService;
import com.eventrush.service.RedisRateLimiterService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    // Swapped from the in-memory BookingQueueService / RateLimiterService
    // to the Redis-backed versions - these now work correctly even if
    // you run multiple instances of this app behind a load balancer.
    @Autowired private RedisBookingQueueService bookingQueueService;
    @Autowired private RedisRateLimiterService rateLimiterService;

    @PostMapping
    public ResponseEntity<BookingResponseDto> book(@Valid @RequestBody BookingRequestDto request)
            throws ExecutionException, InterruptedException {

        // ---- LAYER 1: RATE LIMIT ----
        // Cheapest check, so it runs first - reject spammy users before
        // they even touch the queue or the database.
        if (!rateLimiterService.tryConsume(request.getUserId())) {
            throw new RateLimitExceededException(
                    "Too many booking attempts. Please wait a moment and try again.");
        }

        // ---- LAYER 2 + 3: FAIR QUEUE -> IDEMPOTENCY + LOCK (inside BookingService) ----
        try {
            BookingResponseDto response = bookingQueueService.submit(request)
                    .get(20, TimeUnit.SECONDS); // generous margin for a cold-started stack
                                                  // (first request after docker compose up:
                                                  // MySQL pool, Redis connection, and JVM JIT
                                                  // are all still warming up simultaneously)

            HttpStatus status = response.isReplayed() ? HttpStatus.OK : HttpStatus.CREATED;
            return ResponseEntity.status(status).body(response);

        } catch (ExecutionException e) {
            // Unwrap the real exception (SeatNotAvailableException etc.)
            // so GlobalExceptionHandler can map it to the right status code.
            if (e.getCause() instanceof RuntimeException re) {
                throw re;
            }
            throw e;
        } catch (TimeoutException e) {
            throw new RuntimeException("Booking request timed out - system is under heavy load");
        }
    }
}
