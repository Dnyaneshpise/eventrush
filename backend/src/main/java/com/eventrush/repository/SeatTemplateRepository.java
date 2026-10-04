package com.eventrush.repository;

import com.eventrush.model.SeatTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SeatTemplateRepository extends JpaRepository<SeatTemplate, Long> {
    List<SeatTemplate> findByVenueId(Long venueId);
}
