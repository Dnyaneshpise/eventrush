package com.eventrush.model;

import jakarta.persistence.*;
import lombok.*;

// The venue's reusable seat layout. Copied into fresh Seat rows
// whenever an Event is created against this venue - NOT referenced
// live by Seat, so the booking hot path stays a simple point-query.
@Entity
@Table(
    name = "seat_templates",
    uniqueConstraints = @UniqueConstraint(columnNames = {"venue_id", "seat_number"})
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class SeatTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "venue_id")
    private Venue venue;

    @Column(name = "seat_number")
    private String seatNumber;
}
