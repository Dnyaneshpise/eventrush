package com.eventrush.dto;

import lombok.*;

import java.time.LocalDateTime;

@Getter @Setter
public class EventCreateRequestDto {
    private String name;
    private Long venueId;
    private LocalDateTime bookingOpensAt;
}
