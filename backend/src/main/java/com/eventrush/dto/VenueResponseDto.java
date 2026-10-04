package com.eventrush.dto;

import com.eventrush.model.Venue;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class VenueResponseDto {
    private Long id;
    private String name;
    private String address;
    private int totalSeats;

    public static VenueResponseDto from(Venue v, int totalSeats) {
        return new VenueResponseDto(v.getId(), v.getName(), v.getAddress(), totalSeats);
    }
}
