package com.eventrush.dto;

import com.eventrush.model.Event;
import lombok.*;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class EventResponseDto {
    private Long id;
    private String name;
    private int totalSeats;
    private LocalDateTime bookingOpensAt;
    private Long venueId;
    private String venueName;

    public static EventResponseDto from(Event e) {
        Long venueId = e.getVenue() != null ? e.getVenue().getId() : null;
        String venueName = e.getVenue() != null ? e.getVenue().getName() : null;
        return new EventResponseDto(e.getId(), e.getName(), e.getTotalSeats(), e.getBookingOpensAt(), venueId, venueName);
    }
}
