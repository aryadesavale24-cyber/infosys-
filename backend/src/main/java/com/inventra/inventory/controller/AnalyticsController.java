package com.inventra.inventory.controller;

import com.inventra.inventory.dto.analytics.AnalyticsSummaryDTO;
import com.inventra.inventory.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    /**
     * Main analytics summary endpoint.
     * Returns all KPIs, chart data, and recommendations in one call.
     *
     * Query params:
     * from - ISO date e.g. 2026-01-01 (default: 30 days ago)
     * to - ISO date e.g. 2026-03-15 (default: today)
     * period - DAILY | WEEKLY | MONTHLY (default: DAILY)
     */
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @GetMapping("/summary")
    public ResponseEntity<AnalyticsSummaryDTO> getSummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false, defaultValue = "DAILY") String period) {

        LocalDateTime fromDt = (from != null ? from : LocalDate.now().minusDays(30))
                .atStartOfDay();
        LocalDateTime toDt = (to != null ? to : LocalDate.now())
                .atTime(LocalTime.MAX);

        AnalyticsSummaryDTO summary = analyticsService.getSummary(fromDt, toDt, period);
        return ResponseEntity.ok(summary);
    }
}
