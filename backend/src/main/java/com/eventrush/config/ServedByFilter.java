package com.eventrush.config;

import jakarta.servlet.*;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.InetAddress;

/**
 * Adds a response header showing which container handled this
 * request. In Docker, each container gets a unique auto-generated
 * hostname - so this header will show something like "a3f9c21b0e77"
 * for app1 and a DIFFERENT id for app2.
 *
 * Why this matters for your demo: fire several requests through
 * Nginx (localhost:8080) and watch this header alternate between two
 * different values. That's visible proof the load balancer is really
 * splitting traffic across two independent processes - not just a
 * config file that LOOKS distributed.
 */
@Component
public class ServedByFilter implements Filter {

    private final String hostname;

    public ServedByFilter() {
        String resolved;
        try {
            resolved = InetAddress.getLocalHost().getHostName();
        } catch (Exception e) {
            resolved = "unknown";
        }
        this.hostname = resolved;
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        if (response instanceof jakarta.servlet.http.HttpServletResponse httpResponse) {
            httpResponse.setHeader("X-Served-By", hostname);
        }
        chain.doFilter(request, response);
    }
}
