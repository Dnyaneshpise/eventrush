package com.eventrush.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
    name = "seats",
    uniqueConstraints = @UniqueConstraint(columnNames = {"event_id", "seat_number"})
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Seat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "event_id")
    private Event event;

    @Column(name = "seat_number")
    private String seatNumber;

    @Enumerated(EnumType.STRING)
    private SeatStatus status = SeatStatus.AVAILABLE;

    // Kept for future optimistic-locking use elsewhere in the app
    // (e.g. updating seat metadata that ISN'T the booking-critical path).
    @Version
    private Long version;
}
