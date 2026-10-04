package com.eventrush.exception;

import com.eventrush.dto.ErrorResponseDto;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(SeatNotAvailableException.class)
    public ResponseEntity<ErrorResponseDto> handleSeatTaken(SeatNotAvailableException ex) {
        // 409 Conflict = "your request is valid, but it conflicts with current state"
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ErrorResponseDto("SEAT_NOT_AVAILABLE", ex.getMessage()));
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponseDto> handleNotFound(ResourceNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponseDto("NOT_FOUND", ex.getMessage()));
    }

    @ExceptionHandler(RateLimitExceededException.class)
    public ResponseEntity<ErrorResponseDto> handleRateLimit(RateLimitExceededException ex) {
        // 429 Too Many Requests - the correct status code for rate limiting
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .body(new ErrorResponseDto("RATE_LIMIT_EXCEEDED", ex.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponseDto> handleGeneric(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponseDto("INTERNAL_ERROR", ex.getMessage()));
    }
}
