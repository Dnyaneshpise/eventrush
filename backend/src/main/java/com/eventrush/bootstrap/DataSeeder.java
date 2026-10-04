package com.eventrush.bootstrap;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * Deliberately thin. All the actual seeding logic lives in
 * SeedingService, called through Spring's proxy (not self-invoked),
 * so its @Transactional annotation actually takes effect - see the
 * comment on SeedingService for why that distinction matters here.
 *
 * CONCURRENCY NOTE: with 2 app instances (app1 + app2) starting at
 * nearly the same moment against the SAME shared database, seeding
 * hits the exact race condition this whole project is about - just
 * at startup instead of at booking time. Both instances can check
 * "is the table empty?" at the same instant, both see yes, and both
 * try to insert the same rows; whichever commits second used to hit
 * a unique-constraint violation and crash that instance's entire
 * startup. SeedingService fixes this the same way seat booking is
 * fixed: an explicit lock around the check-then-act (a MySQL
 * advisory lock here, since there's no row to lock yet).
 */
@Component
public class DataSeeder implements CommandLineRunner {

    @Autowired private SeedingService seedingService;

    @Override
    public void run(String... args) {
        // Never let a seeding problem take down the whole app -
        // seeding is a convenience, not something the app's actual
        // purpose depends on.
        try {
            seedingService.seedIfNeeded();
        } catch (Exception e) {
            System.out.println("[SEED] Skipping seed due to: " + e.getMessage()
                    + " (expected if another instance is seeding concurrently)");
        }
    }
}
