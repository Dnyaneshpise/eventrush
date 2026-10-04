package com.eventrush;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class EventrushApplication {
    public static void main(String[] args) {
        SpringApplication.run(EventrushApplication.class, args);
    }
}
