package com.eventrush.service;

import com.eventrush.dto.EventCreateRequestDto;
import com.eventrush.dto.EventResponseDto;
import com.eventrush.exception.ResourceNotFoundException;
import com.eventrush.model.Event;
import com.eventrush.model.Seat;
import com.eventrush.model.SeatStatus;
import com.eventrush.model.SeatTemplate;
import com.eventrush.model.Venue;
import com.eventrush.repository.EventRepository;
import com.eventrush.repository.SeatRepository;
import com.eventrush.repository.SeatTemplateRepository;
import com.eventrush.repository.VenueRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class EventCreationService {

    @Autowired private EventRepository eventRepository;
    @Autowired private VenueRepository venueRepository;
    @Autowired private SeatTemplateRepository seatTemplateRepository;
    @Autowired private SeatRepository seatRepository;

    // Sync, one transaction: Event + every Seat row are created together.
    // If copying seats fails partway, the whole thing rolls back - no
    // half-seeded event is ever visible to bookers.
    @Transactional
    public EventResponseDto createEvent(EventCreateRequestDto request) {
        Venue venue = venueRepository.findById(request.getVenueId())
                .orElseThrow(() -> new ResourceNotFoundException("Venue not found: " + request.getVenueId()));

        List<SeatTemplate> templates = seatTemplateRepository.findByVenueId(venue.getId());

        Event event = new Event();
        event.setName(request.getName());
        event.setVenue(venue);
        event.setTotalSeats(templates.size());
        event.setBookingOpensAt(request.getBookingOpensAt());
        event = eventRepository.save(event);

        for (SeatTemplate template : templates) {
            Seat seat = new Seat();
            seat.setEvent(event);
            seat.setSeatNumber(template.getSeatNumber());
            seat.setStatus(SeatStatus.AVAILABLE);
            seatRepository.save(seat);
        }

        return EventResponseDto.from(event);
    }
}
