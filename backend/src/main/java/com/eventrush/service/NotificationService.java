package com.eventrush.service;

import com.eventrush.model.Booking;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * Sending a confirmation email/SMS should NEVER make the user wait.
 * @Async runs this on a separate thread pool, so bookSeat() returns
 * to the user immediately after the booking is saved, while this
 * runs in the background.
 *
 * In a real system, this would publish an event to Kafka/RabbitMQ
 * instead, so it survives even if this app instance crashes right
 * after. Async-in-process is the simple version of that same idea.
 */
@Service
public class NotificationService {

    @Async
    public void sendBookingConfirmation(Booking booking) {
        try {
            Thread.sleep(1000); // simulate slow email/SMS provider call
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        System.out.println("[ASYNC] Confirmation sent to user " + booking.getUser().getId()
                + " for seat " + booking.getSeat().getId());
    }
}
