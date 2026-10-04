package com.eventrush.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "events")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Event {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    // Nullable: the original seeded event predates the Venue concept.
    @ManyToOne
    @JoinColumn(name = "venue_id")
    private Venue venue;

    private int totalSeats;

    private LocalDateTime bookingOpensAt;
}
