package com.eventrush.service;

import com.eventrush.dto.BookingRequestDto;
import com.eventrush.dto.BookingResponseDto;
import com.eventrush.exception.ResourceNotFoundException;
import com.eventrush.exception.SeatNotAvailableException;
import com.eventrush.model.*;
import com.eventrush.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BookingService {

    @Autowired private SeatRepository seatRepository;
    @Autowired private BookingRepository bookingRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private EventRepository eventRepository;
    @Autowired private NotificationService notificationService;

    /**
     * This is the method that actually does the booking. It is called
     * from inside BookingQueueService's worker thread, one request at
     * a time, per event - so at THIS layer, requests for the same
     * event are already serialized (no concurrent calls for the same
     * event reach here simultaneously).
     *
     * We STILL use the pessimistic lock below, on purpose. Why?
     * Because in a real deployment you'd run multiple app instances
     * behind a load balancer. The in-memory queue only protects you
     * WITHIN one instance. The DB lock protects you ACROSS instances.
     * This is "defense in depth" - never rely on just one layer.
     */
    @Transactional
    public BookingResponseDto bookSeat(BookingRequestDto request) {

        // ---- STEP 1: IDEMPOTENCY CHECK ----
        // Has this exact attempt already been processed? (e.g. user's
        // network dropped and their client retried with the same key)
        var existing = bookingRepository.findByIdempotencyKey(request.getIdempotencyKey());
        if (existing.isPresent()) {
            // Don't book again. Just return what happened last time.
            return BookingResponseDto.from(existing.get(), true);
        }

        // ---- STEP 2: LOCK THE SEAT ROW ----
        // findByIdForUpdate issues "SELECT ... FOR UPDATE". Any other
        // transaction trying to lock this SAME row will now wait
        // right here until this transaction commits or rolls back.
        Seat seat = seatRepository.findByIdForUpdate(request.getSeatId())
                .orElseThrow(() -> new ResourceNotFoundException("Seat not found: " + request.getSeatId()));

        // ---- STEP 3: CHECK + ACT, ATOMICALLY ----
        // Because we're holding the row lock, no other transaction
        // could have changed this status between our read and write.
        if (seat.getStatus() != SeatStatus.AVAILABLE) {
            throw new SeatNotAvailableException("Seat " + seat.getId() + " is already booked");
        }

        seat.setStatus(SeatStatus.BOOKED);
        seatRepository.save(seat);

        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + request.getUserId()));

        Event event = eventRepository.findById(request.getEventId())
                .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + request.getEventId()));

        Booking booking = new Booking();
        booking.setUser(user);
        booking.setSeat(seat);
        booking.setEvent(event);
        booking.setIdempotencyKey(request.getIdempotencyKey());
        booking.setStatus(BookingStatus.CONFIRMED);

        Booking saved = bookingRepository.save(booking);

        // Fire-and-forget - doesn't block the response, doesn't hold the lock
        notificationService.sendBookingConfirmation(saved);

        return BookingResponseDto.from(saved, false);
    }
}
