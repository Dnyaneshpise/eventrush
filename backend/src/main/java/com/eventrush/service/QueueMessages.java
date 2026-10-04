package com.eventrush.service;

import com.eventrush.dto.BookingRequestDto;
import com.eventrush.dto.BookingResponseDto;

/** What gets pushed onto the Redis queue - the request plus a tracking ID. */
record TaskEnvelope(String taskId, BookingRequestDto request) {}

/**
 * What the worker pushes back once it's done processing.
 * Either 'response' is set (success), or 'error' + 'errorMessage' are
 * set (failure) - never both.
 */
record ResultEnvelope(BookingResponseDto response, String error, String errorMessage) {

    static ResultEnvelope success(BookingResponseDto response) {
        return new ResultEnvelope(response, null, null);
    }

    static ResultEnvelope failure(String errorType, String message) {
        return new ResultEnvelope(null, errorType, message);
    }
}
