package com.inventra.inventory.controller;

import com.inventra.inventory.dto.StockAlertDTO;
import com.inventra.inventory.dto.StockAlertSummaryDTO;
import com.inventra.inventory.model.AlertStatus;
import com.inventra.inventory.model.AlertType;
import com.inventra.inventory.service.StockAlertService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/alerts")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class StockAlertController {

    private final StockAlertService stockAlertService;

    /**
     * GET /api/alerts/pending
     * Returns every PENDING alert (all types). Used by dashboard badge.
     */
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STAFF')")
    @GetMapping("/pending")
    public ResponseEntity<List<StockAlertDTO>> getPendingAlerts() {
        return ResponseEntity.ok(stockAlertService.getPendingAlerts());
    }

    /**
     * GET /api/alerts
     * Full paginated list of all alerts, regardless of status.
     * Used by the dedicated Stock Alerts management page.
     */
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STAFF')")
    @GetMapping
    public ResponseEntity<Page<StockAlertDTO>> getAllAlerts(Pageable pageable) {
        return ResponseEntity.ok(stockAlertService.getAllAlerts(pageable));
    }

    /**
     * GET /api/alerts/summary
     * Returns count breakdown by status and type for dashboard widget.
     */
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STAFF')")
    @GetMapping("/summary")
    public ResponseEntity<StockAlertSummaryDTO> getAlertSummary() {
        return ResponseEntity.ok(stockAlertService.getAlertSummary());
    }

    /**
     * GET /api/alerts/status/{status}
     * Paginated alerts filtered by status (PENDING / ACKNOWLEDGED / RESOLVED).
     */
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STAFF')")
    @GetMapping("/status/{status}")
    public ResponseEntity<Page<StockAlertDTO>> getAlertsByStatus(
            @PathVariable AlertStatus status,
            Pageable pageable) {
        return ResponseEntity.ok(stockAlertService.getAlertsByStatus(status, pageable));
    }

    /**
     * GET /api/alerts/type/{type}
     * Paginated alerts filtered by type (LOW_STOCK / OUT_OF_STOCK / OVERSTOCK).
     */
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STAFF')")
    @GetMapping("/type/{type}")
    public ResponseEntity<Page<StockAlertDTO>> getAlertsByType(
            @PathVariable AlertType type,
            Pageable pageable) {
        return ResponseEntity.ok(stockAlertService.getAlertsByType(type, pageable));
    }

    /**
     * PATCH /api/alerts/{id}/acknowledge
     * Marks a single alert as ACKNOWLEDGED by the logged-in user.
     */
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @PatchMapping("/{id}/acknowledge")
    public ResponseEntity<StockAlertDTO> acknowledgeAlert(@PathVariable Long id) {
        return ResponseEntity.ok(stockAlertService.acknowledgeAlert(id));
    }
}
