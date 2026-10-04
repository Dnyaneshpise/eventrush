package com.eventrush.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "venues")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Venue {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String address;

    // No real auth yet - nullable placeholder for "who owns this venue".
    private Long createdByUserId;

    // Lets a venue be reused by others later without building real
    // multi-tenancy now.
    private boolean isPublic = true;
}
