package com.eventrush.dto;

import lombok.*;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class ErrorResponseDto {
    private String error;
    private String message;
    private LocalDateTime timestamp = LocalDateTime.now();

    public ErrorResponseDto(String error, String message) {
        this.error = error;
        this.message = message;
    }
}
