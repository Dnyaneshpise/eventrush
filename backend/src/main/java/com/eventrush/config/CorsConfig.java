package com.eventrush.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Handles the browser's Origin header on API requests.
 *
 * Correction from an earlier version of this file: this was assumed
 * to be a rarely-used fallback, on the theory that the frontend's
 * reverse proxy makes every request look same-origin. That's true
 * for the REQUEST ROUTING, but browsers still attach an Origin
 * header on POST/PUT/DELETE requests regardless of how the proxy is
 * set up - and Spring's CORS layer rejects any Origin it doesn't
 * recognize, with a 403, BEFORE the request reaches our controller
 * or GlobalExceptionHandler. That's exactly what happened when the
 * frontend moved to Docker on port 3000: this config still only
 * knew about the Vite dev ports (5173, 4173), so port 3000 got
 * silently rejected.
 *
 * Using allowedOriginPatterns with a wildcard here instead of a
 * fixed list, so the next new port (another dev tool, a different
 * docker-compose port mapping, etc.) doesn't cause the same bug
 * again.
 */
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOriginPatterns("http://localhost:*", "http://127.0.0.1:*")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .exposedHeaders("X-Served-By");
    }
}
