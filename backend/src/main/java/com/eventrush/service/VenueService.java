package com.eventrush.service;

import com.eventrush.dto.VenueCreateRequestDto;
import com.eventrush.dto.VenueResponseDto;
import com.eventrush.model.SeatTemplate;
import com.eventrush.model.Venue;
import com.eventrush.repository.SeatTemplateRepository;
import com.eventrush.repository.VenueRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class VenueService {

    @Autowired private VenueRepository venueRepository;
    @Autowired private SeatTemplateRepository seatTemplateRepository;

    // One transaction: a venue with no seat templates isn't useful, so
    // if the bulk template insert fails partway, roll the venue back too.
    @Transactional
    public VenueResponseDto createVenue(VenueCreateRequestDto request) {
        Venue venue = new Venue();
        venue.setName(request.getName());
        venue.setAddress(request.getAddress());
        venue.setPublic(true);
        venue = venueRepository.save(venue);

        int total = 0;
        for (String row : request.getRowLabels()) {
            for (int i = 1; i <= request.getSeatsPerRow(); i++) {
                SeatTemplate template = new SeatTemplate();
                template.setVenue(venue);
                template.setSeatNumber(row + i);
                seatTemplateRepository.save(template);
                total++;
            }
        }
        return VenueResponseDto.from(venue, total);
    }

    public List<VenueResponseDto> listVenues() {
        return venueRepository.findAll().stream()
                .map(v -> VenueResponseDto.from(v, seatTemplateRepository.findByVenueId(v.getId()).size()))
                .toList();
    }
}
