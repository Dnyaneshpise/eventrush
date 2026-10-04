package com.eventrush.dto;

import com.eventrush.model.Booking;
import lombok.*;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class BookingResponseDto {

    private Long bookingId;
    private Long userId;
    private Long seatId;
    private Long eventId;
    private String status;
    private String idempotencyKey;
    private LocalDateTime createdAt;
    private boolean replayed; // true if this was a duplicate retry, not a fresh booking

    public static BookingResponseDto from(Booking b, boolean replayed) {
        BookingResponseDto dto = new BookingResponseDto();
        dto.setBookingId(b.getId());
        dto.setUserId(b.getUser().getId());
        dto.setSeatId(b.getSeat().getId());
        dto.setEventId(b.getEvent().getId());
        dto.setStatus(b.getStatus().name());
        dto.setIdempotencyKey(b.getIdempotencyKey());
        dto.setCreatedAt(b.getCreatedAt());
        dto.setReplayed(replayed);
        return dto;
    }
}
