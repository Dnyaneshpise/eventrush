package com.eventrush.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class BookingRequestDto {

    @NotNull
    private Long userId;

    @NotNull
    private Long seatId;

    @NotNull
    private Long eventId; // used to route this request into the correct event's fair-ordering queue

    // Client generates this ONCE per "attempt" and resends the SAME
    // value on every retry of that attempt. This is what makes the
    // booking endpoint safe to retry blindly on network failure.
    @NotBlank
    private String idempotencyKey;
}
