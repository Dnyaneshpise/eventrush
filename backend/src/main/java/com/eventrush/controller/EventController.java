package com.eventrush.controller;

import com.eventrush.dto.EventCreateRequestDto;
import com.eventrush.dto.EventResponseDto;
import com.eventrush.dto.SeatResponseDto;
import com.eventrush.exception.ResourceNotFoundException;
import com.eventrush.repository.EventRepository;
import com.eventrush.repository.SeatRepository;
import com.eventrush.service.EventCreationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/events")
public class EventController {

    @Autowired private EventRepository eventRepository;
    @Autowired private SeatRepository seatRepository;
    @Autowired private EventCreationService eventCreationService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public EventResponseDto createEvent(@RequestBody EventCreateRequestDto request) {
        return eventCreationService.createEvent(request);
    }

    @GetMapping
    public List<EventResponseDto> listEvents() {
        return eventRepository.findAll().stream().map(EventResponseDto::from).toList();
    }

    @GetMapping("/{eventId}/seats")
    public List<SeatResponseDto> listSeats(@PathVariable Long eventId) {
        if (!eventRepository.existsById(eventId)) {
            throw new ResourceNotFoundException("Event not found: " + eventId);
        }
        return seatRepository.findByEventId(eventId).stream().map(SeatResponseDto::from).toList();
    }
}
