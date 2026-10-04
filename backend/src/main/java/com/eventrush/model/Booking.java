package com.eventrush.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "bookings")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @OneToOne
    @JoinColumn(name = "seat_id", unique = true)   // DB-level safety net: 1 seat -> 1 booking, ever
    private Seat seat;

    @ManyToOne
    @JoinColumn(name = "event_id")
    private Event event;

    @Column(unique = true, nullable = false)
    private String idempotencyKey;

    @Enumerated(EnumType.STRING)
    private BookingStatus status;

    private LocalDateTime createdAt = LocalDateTime.now();
}
