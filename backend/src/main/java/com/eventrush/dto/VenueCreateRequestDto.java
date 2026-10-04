package com.eventrush.dto;

import lombok.*;

import java.util.List;

@Getter @Setter
public class VenueCreateRequestDto {
    private String name;
    private String address;
    private List<String> rowLabels;   // e.g. ["A", "B", "C"]
    private int seatsPerRow;
}
