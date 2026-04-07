package com.inventra.inventory.controller;

import com.inventra.inventory.service.StockOutApprovalService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/approvals")
@RequiredArgsConstructor
@CrossOrigin(origins = { "http://localhost:3000", "http://localhost:5173" })
public class StockOutApprovalController {

    private final StockOutApprovalService approvalService;

    // ── STAFF endpoints ───────────────────────────────────────────────────

    /**
     * Get all online managers for a product's category.
     * Staff calls this to populate the "choose a manager" dropdown.
     */
    @PreAuthorize("hasRole('STAFF')")
    @GetMapping("/online-managers/{productId}")
    public ResponseEntity<List<?>> getOnlineManagers(@PathVariable Long productId) {
        return ResponseEntity.ok(approvalService.getOnlineManagersForProduct(productId));
    }

    /**
     * Raise a new approval request for a large stock-out.
     * Body: { productId, quantity, managerId, notes?, referenceNumber? }
     */
    @PreAuthorize("hasRole('STAFF')")
    @PostMapping("/request")
    public ResponseEntity<?> requestApproval(@RequestBody Map<String, Object> body) {
        try {
            Long productId = Long.valueOf(body.get("productId").toString());
            Integer quantity = Integer.valueOf(body.get("quantity").toString());
            Long managerId = Long.valueOf(body.get("managerId").toString());
            String notes = body.containsKey("notes") ? body.get("notes").toString() : null;
            String referenceNumber = body.containsKey("referenceNumber") ? body.get("referenceNumber").toString()
                    : null;

            return new ResponseEntity<>(
                    approvalService.requestApproval(productId, quantity, managerId, notes, referenceNumber),
                    HttpStatus.CREATED);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Staff: see all own approval requests and their current status.
     */
    @PreAuthorize("hasRole('STAFF')")
    @GetMapping("/my-requests")
    public ResponseEntity<List<?>> getMyRequests() {
        return ResponseEntity.ok(approvalService.getMyRequests());
    }

    // ── MANAGER endpoints ─────────────────────────────────────────────────

    /**
     * Manager: get all PENDING requests directed at them.
     */
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @GetMapping("/pending")
    public ResponseEntity<List<?>> getPending() {
        return ResponseEntity.ok(approvalService.getPendingForManager());
    }

    /**
     * Manager: get all requests (any status) — for full history.
     */
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @GetMapping("/all")
    public ResponseEntity<List<?>> getAll() {
        return ResponseEntity.ok(approvalService.getAllForManager());
    }

    /**
     * Manager: approve a pending request.
     * Body: { note? }
     */
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @PostMapping("/{requestId}/approve")
    public ResponseEntity<?> approve(@PathVariable Long requestId,
            @RequestBody(required = false) Map<String, Object> body) {
        try {
            String note = (body != null && body.containsKey("note")) ? body.get("note").toString() : null;
            return ResponseEntity.ok(approvalService.approve(requestId, note));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Manager: reject a pending request.
     * Body: { note? }
     */
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @PostMapping("/{requestId}/reject")
    public ResponseEntity<?> reject(@PathVariable Long requestId,
            @RequestBody(required = false) Map<String, Object> body) {
        try {
            String note = (body != null && body.containsKey("note")) ? body.get("note").toString() : null;
            return ResponseEntity.ok(approvalService.reject(requestId, note));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
