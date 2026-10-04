package com.eventrush.controller;

import com.eventrush.dto.VenueCreateRequestDto;
import com.eventrush.dto.VenueResponseDto;
import com.eventrush.service.VenueService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/venues")
public class VenueController {

    @Autowired private VenueService venueService;

    @GetMapping
    public List<VenueResponseDto> listVenues() {
        return venueService.listVenues();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public VenueResponseDto createVenue(@RequestBody VenueCreateRequestDto request) {
        return venueService.createVenue(request);
    }
}
