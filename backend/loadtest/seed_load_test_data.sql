-- ============================================================
-- LOAD TEST DATA SEEDING
-- Run this ONLY in a dedicated load-testing session - it wipes
-- existing bookings/seats/events/users and replaces them with a
-- deterministic dataset sized for a real throughput test.
--
-- After load testing, restart the app with an empty DB (or just
-- re-run the app against a fresh schema) to get the small 5-seat
-- interview demo dataset back via DataSeeder.
--
-- What this creates:
--   Event id=1: "JMeter Load Test Event", 5001 seats
--     - Seat id=1        -> reserved, used ONLY by the race-condition
--                            thread group (300 users vs 1 seat)
--     - Seats id=2..5001 -> used by the throughput thread group
--                            (5000 users, each books exactly 1 seat,
--                            no contention - measures raw system
--                            throughput, not lock wait time)
--   Users id=1..5000
-- ============================================================

SET SESSION cte_max_recursion_depth = 5000;

DELETE FROM bookings;
DELETE FROM seats;
DELETE FROM events;
DELETE FROM users;
ALTER TABLE bookings AUTO_INCREMENT = 1;
ALTER TABLE seats AUTO_INCREMENT = 1;
ALTER TABLE events AUTO_INCREMENT = 1;
ALTER TABLE users AUTO_INCREMENT = 1;

INSERT INTO events (name, total_seats, booking_opens_at)
VALUES ('JMeter Load Test Event', 5001, NOW());

-- event id will be 1 (table was just reset)

INSERT INTO seats (event_id, seat_number, status)
WITH RECURSIVE seq AS (
    SELECT 1 AS n
    UNION ALL
    SELECT n + 1 FROM seq WHERE n < 5001
)
SELECT 1, CONCAT('LT-', n), 'AVAILABLE' FROM seq;

INSERT INTO users (name, email)
WITH RECURSIVE seq AS (
    SELECT 1 AS n
    UNION ALL
    SELECT n + 1 FROM seq WHERE n < 5000
)
SELECT CONCAT('Load Test User ', n), CONCAT('loadtest', n, '@test.com') FROM seq;

-- Sanity check output
SELECT COUNT(*) AS seat_count FROM seats;
SELECT COUNT(*) AS user_count FROM users;
