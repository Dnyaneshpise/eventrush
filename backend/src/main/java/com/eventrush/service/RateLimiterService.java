package com.eventrush.service;

import org.springframework.stereotype.Service;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Token Bucket rate limiter, built from scratch (no external library),
 * so you can explain exactly how it works in an interview.
 *
 * Idea in plain English:
 * - Every user has a "bucket" that holds up to MAX_TOKENS tokens.
 * - Each booking attempt costs 1 token.
 * - Tokens refill slowly over time (like a bucket filling with water
 *   at a steady drip), up to the max.
 * - If the bucket is empty, the user is blocked until it refills.
 *
 * This stops one user from spamming "Buy" 100 times/second to try to
 * brute-force their way to the front of the queue.
 *
 * NOTE: This is in-memory, so it only works correctly on a SINGLE
 * server instance. If you scale to multiple servers, this state needs
 * to move to Redis (INCR + EXPIRE, or a Lua script for atomicity) so
 * all instances share the same counters. Mentioning this tradeoff in
 * an interview shows you understand the limits of your own design.
 */
@Service
public class RateLimiterService {

    private static final int MAX_TOKENS = 5;              // bucket size
    private static final long REFILL_INTERVAL_MS = 2000;  // 1 token every 2 seconds

    private final ConcurrentHashMap<Long, Bucket> buckets = new ConcurrentHashMap<>();

    public boolean tryConsume(Long userId) {
        Bucket bucket = buckets.computeIfAbsent(userId, id -> new Bucket(MAX_TOKENS));
        return bucket.tryConsume();
    }

    private static class Bucket {
        private final AtomicLong tokens;
        private volatile long lastRefillTimestamp;

        Bucket(int initialTokens) {
            this.tokens = new AtomicLong(initialTokens);
            this.lastRefillTimestamp = System.currentTimeMillis();
        }

        synchronized boolean tryConsume() {
            refill();
            if (tokens.get() > 0) {
                tokens.decrementAndGet();
                return true;
            }
            return false;
        }

        private void refill() {
            long now = System.currentTimeMillis();
            long elapsed = now - lastRefillTimestamp;

            if (elapsed >= REFILL_INTERVAL_MS) {
                long tokensToAdd = elapsed / REFILL_INTERVAL_MS;
                if (tokensToAdd > 0) {
                    long newTokenCount = Math.min(MAX_TOKENS, tokens.get() + tokensToAdd);
                    tokens.set(newTokenCount);
                    lastRefillTimestamp = now;
                }
            }
        }
    }
}
