package com.eventrush.dto;

import com.eventrush.model.Seat;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class SeatResponseDto {
    private Long id;
    private String seatNumber;
    private String status;

    public static SeatResponseDto from(Seat s) {
        return new SeatResponseDto(s.getId(), s.getSeatNumber(), s.getStatus().name());
    }
}
