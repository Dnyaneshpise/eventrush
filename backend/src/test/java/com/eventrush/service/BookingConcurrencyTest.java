package com.eventrush.service;

import com.eventrush.dto.BookingRequestDto;
import com.eventrush.model.*;
import com.eventrush.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * THE most important test in this project.
 *
 * This is the automated version of the live demo we ran manually:
 * fire many concurrent requests at ONE seat, and prove that EXACTLY
 * ONE of them succeeds - no overselling, no matter how many threads
 * hit it at once.
 *
 * Run with: mvn test -Dtest=BookingConcurrencyTest
 */
@SpringBootTest
class BookingConcurrencyTest {

    @Autowired private BookingQueueService bookingQueueService;
    @Autowired private EventRepository eventRepository;
    @Autowired private SeatRepository seatRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private BookingRepository bookingRepository;

    private Long eventId;
    private Long seatId;

    @BeforeEach
    void setUp() {
        bookingRepository.deleteAll();
        seatRepository.deleteAll();
        eventRepository.deleteAll();
        userRepository.deleteAll();

        Event event = new Event();
        event.setName("Load Test Concert");
        event.setTotalSeats(1);
        event.setBookingOpensAt(LocalDateTime.now());
        event = eventRepository.save(event);
        eventId = event.getId();

        Seat seat = new Seat();
        seat.setEvent(event);
        seat.setSeatNumber("A1");
        seat.setStatus(SeatStatus.AVAILABLE);
        seat = seatRepository.save(seat);
        seatId = seat.getId();

        for (int i = 1; i <= 100; i++) {
            User user = new User();
            user.setName("Load Test User " + i);
            user.setEmail("loadtest" + i + "@test.com");
            userRepository.save(user);
        }
    }

    @Test
    void hundredUsersFightingForOneSeat_onlyOneShouldWin() throws InterruptedException {
        int numberOfUsers = 100;
        List<User> users = userRepository.findAll();

        ExecutorService pool = Executors.newFixedThreadPool(numberOfUsers);
        CountDownLatch startSignal = new CountDownLatch(1);
        CountDownLatch doneSignal = new CountDownLatch(numberOfUsers);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger conflictCount = new AtomicInteger(0);

        for (User user : users) {
            pool.submit(() -> {
                try {
                    startSignal.await(); // all 100 threads wait here...

                    BookingRequestDto request = new BookingRequestDto();
                    request.setUserId(user.getId());
                    request.setSeatId(seatId);
                    request.setEventId(eventId);
                    request.setIdempotencyKey("test-key-user-" + user.getId());

                    bookingQueueService.submit(request).get(15, TimeUnit.SECONDS);
                    successCount.incrementAndGet();

                } catch (Exception e) {
                    // Expected for 99 of the 100 users - seat already taken
                    conflictCount.incrementAndGet();
                } finally {
                    doneSignal.countDown();
                }
            });
        }

        startSignal.countDown(); // ...then all release at once - the "6am rush"
        doneSignal.await(30, TimeUnit.SECONDS);
        pool.shutdown();

        System.out.println("Successful bookings: " + successCount.get());
        System.out.println("Rejected (seat taken): " + conflictCount.get());

        // THE CRITICAL ASSERTION - this is what proves the fix works
        assertEquals(1, successCount.get(), "Exactly ONE user should have booked the seat");
        assertEquals(99, conflictCount.get(), "The other 99 should have been rejected");
        assertEquals(1, bookingRepository.count(), "Only 1 booking row should exist in the DB");
    }

    @Test
    void sameIdempotencyKeyRetried_shouldNotCreateDuplicateBooking() throws Exception {
        BookingRequestDto request = new BookingRequestDto();
        request.setUserId(userRepository.findAll().get(0).getId());
        request.setSeatId(seatId);
        request.setEventId(eventId);
        request.setIdempotencyKey("same-key-retried");

        // Simulate the SAME request being sent 5 times (client retry on network failure)
        for (int i = 0; i < 5; i++) {
            bookingQueueService.submit(request).get(10, TimeUnit.SECONDS);
        }

        assertEquals(1, bookingRepository.count(),
                "Retrying the same idempotency key must NOT create multiple bookings");
    }
}
