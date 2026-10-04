package com.eventrush.repository;

import com.eventrush.model.Seat;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface SeatRepository extends JpaRepository<Seat, Long> {

    List<Seat> findByEventId(Long eventId);

    // THE CORE FIX for the race condition.
    // PESSIMISTIC_WRITE translates to "SELECT ... FOR UPDATE" in MySQL.
    // Whoever runs this query first LOCKS that row. Every other
    // transaction asking for the SAME row must WAIT until the first
    // transaction commits or rolls back. This is the DB-level version
    // of the `synchronized` block from FixedBooking.java.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from Seat s where s.id = :id")
    Optional<Seat> findByIdForUpdate(@Param("id") Long id);
}
