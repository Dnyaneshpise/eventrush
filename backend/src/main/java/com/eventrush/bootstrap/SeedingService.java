package com.eventrush.bootstrap;

import com.eventrush.model.*;
import com.eventrush.repository.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * The actual seeding logic, split out from DataSeeder into its own
 * Spring-managed bean specifically so @Transactional works correctly.
 *
 * If this method lived directly in DataSeeder and were called as
 * `this.seedIfNeeded()` from within DataSeeder.run(), Spring's
 * @Transactional would be silently ignored - Spring implements
 * transactions via a proxy that wraps the bean, and calling a method
 * on `this` from inside the same class bypasses that proxy entirely.
 * Nothing throws an error; the transaction just never opens, and the
 * GET_LOCK / RELEASE_LOCK pair could end up on two different pooled
 * connections, silently breaking the whole mutual-exclusion mechanism.
 * Putting the method in a SEPARATE bean and calling it from DataSeeder
 * means the call goes through the proxy properly.
 */
@Service
public class SeedingService {

    @Autowired private EventRepository eventRepository;
    @Autowired private SeatRepository seatRepository;
    @Autowired private UserRepository userRepository;

    @PersistenceContext
    private EntityManager entityManager;

    private static final String[] ROWS = {"A", "B", "C"};
    private static final int SEATS_PER_ROW = 10;

    private static final java.util.Set<String> PRE_BOOKED = java.util.Set.of(
            "A3", "A4", "B1", "B7", "B8", "C2", "C9", "C10"
    );

    @Transactional
    public void seedIfNeeded() {
        // MySQL's GET_LOCK() returns a BIGINT, which Hibernate maps to a
        // Java Long - not an Integer. Casting the raw result straight to
        // Integer throws ClassCastException (Long and Integer are unrelated
        // boxed types, neither is a subclass of the other). Go through
        // Number instead so this works regardless of which boxed numeric
        // type the driver/dialect hands back.
        Number acquired = (Number) entityManager
                .createNativeQuery("SELECT GET_LOCK('eventrush_seed_lock', 30)")
                .getSingleResult();

        if (acquired == null || acquired.intValue() != 1) {
            System.out.println("[SEED] Could not acquire seed lock within 30s "
                    + "(another instance is likely holding it) - skipping.");
            return;
        }

        try {
            if (eventRepository.count() > 0) {
                System.out.println("[SEED] Data already exists, skipping seed.");
                return;
            }

            int totalSeats = ROWS.length * SEATS_PER_ROW;

            Event event = new Event();
            event.setName("Coldplay Concert - Bengaluru");
            event.setTotalSeats(totalSeats);
            event.setBookingOpensAt(LocalDateTime.now());
            event = eventRepository.save(event);

            for (String row : ROWS) {
                for (int i = 1; i <= SEATS_PER_ROW; i++) {
                    String seatNumber = row + i;
                    Seat seat = new Seat();
                    seat.setEvent(event);
                    seat.setSeatNumber(seatNumber);
                    seat.setStatus(PRE_BOOKED.contains(seatNumber) ? SeatStatus.BOOKED : SeatStatus.AVAILABLE);
                    seatRepository.save(seat);
                }
            }

            for (int i = 1; i <= 50; i++) {
                User user = new User();
                user.setName("Test User " + i);
                user.setEmail("u" + i + "@test.com");
                userRepository.save(user);
            }

            System.out.println("[SEED] Created event id=" + event.getId()
                    + " with " + totalSeats + " seats (" + PRE_BOOKED.size()
                    + " pre-booked) and 50 test users (id 1-50).");
        } finally {
            entityManager.createNativeQuery("SELECT RELEASE_LOCK('eventrush_seed_lock')").getSingleResult();
        }
    }
}