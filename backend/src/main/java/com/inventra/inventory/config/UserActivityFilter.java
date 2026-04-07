package com.inventra.inventory.config;

import com.inventra.inventory.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.LocalDateTime;

/**
 * Updates the last_active_at timestamp on every authenticated API request.
 * This allows us to detect which managers are currently "online"
 * (active within the last 10 minutes) for the approval request flow.
 */
@Component
@RequiredArgsConstructor
public class UserActivityFilter extends OncePerRequestFilter {

    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
            String username = auth.getName();
            // Fire-and-forget — don't block the request
            try {
                userRepository.findByUsername(username).ifPresent(user -> {
                    LocalDateTime now = LocalDateTime.now();
                    if (user.getLastActiveAt() == null || user.getLastActiveAt().isBefore(now.minusSeconds(60))) {
                        user.setLastActiveAt(now);
                        userRepository.save(user);
                    }
                });
            } catch (Exception ignored) {
                // never let activity tracking break an API call
            }
        }

        filterChain.doFilter(request, response);
    }
}
