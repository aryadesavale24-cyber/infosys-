package com.inventra.inventory.controller;

import com.inventra.inventory.dto.ReturnRequestDTO;
import com.inventra.inventory.model.ItemCondition;
import com.inventra.inventory.model.ReturnReason;
import com.inventra.inventory.service.ReturnRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST controller for the customer return workflow.
 *
 * Base path: /api/returns
 *
 * STAFF endpoints:
 * POST /api/returns/request — raise a return request
 * GET /api/returns/my-requests — staff views own requests
 *
 * MANAGER / ADMIN endpoints:
 * GET /api/returns/pending — pending requests for this manager
 * GET /api/returns/all — all requests for this manager (history)
 * GET /api/returns/product/{productId} — all returns for a product
 * GET /api/returns/pending-count — badge count of pending returns
 * POST /api/returns/{id}/approve-restock — approve → restock (RETURN tx)
 * POST /api/returns/{id}/approve-damage — approve → write-off (DAMAGE tx)
 * POST /api/returns/{id}/reject — reject return
 */
@RestController
@RequestMapping("/api/returns")
@RequiredArgsConstructor
@CrossOrigin(origins = { "http://localhost:3000", "http://localhost:5173" })
public class ReturnRequestController {

    private final ReturnRequestService returnService;


    @PreAuthorize("hasAnyRole('STAFF', 'MANAGER', 'ADMIN')")
    @PostMapping("/request")
    public ResponseEntity<?> raiseReturnRequest(@RequestBody Map<String, Object> body) {
        try {
            Long productId = Long.valueOf(body.get("productId").toString());
            Integer quantity = Integer.valueOf(body.get("quantity").toString());
            Long managerId = Long.valueOf(body.get("managerId").toString());

            ReturnReason returnReason = ReturnReason.valueOf(
                    body.get("returnReason").toString().toUpperCase());
            ItemCondition itemCondition = ItemCondition.valueOf(
                    body.get("itemCondition").toString().toUpperCase());

            String originalSaleRef = body.containsKey("originalSaleRef")
                    ? body.get("originalSaleRef").toString()
                    : null;
            String customerName = body.containsKey("customerName")
                    ? body.get("customerName").toString()
                    : null;
            String staffNotes = body.containsKey("staffNotes")
                    ? body.get("staffNotes").toString()
                    : null;

            ReturnRequestDTO result = returnService.raiseReturnRequest(
                    productId, quantity, returnReason, itemCondition,
                    managerId, originalSaleRef, customerName, staffNotes);

            return new ResponseEntity<>(result, HttpStatus.CREATED);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Staff views all their own return requests (all statuses).
     */
    @PreAuthorize("hasAnyRole('STAFF', 'MANAGER', 'ADMIN')")
    @GetMapping("/my-requests")
    public ResponseEntity<List<ReturnRequestDTO>> getMyRequests() {
        return ResponseEntity.ok(returnService.getMyRequests());
    }

    // ── MANAGER / ADMIN endpoints ─────────────────────────────────────────────

    /**
     * Manager sees all PENDING return requests directed at them.
     */
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @GetMapping("/pending")
    public ResponseEntity<List<ReturnRequestDTO>> getPending() {
        return ResponseEntity.ok(returnService.getPendingForManager());
    }

    /**
     * Manager sees all return requests directed at them (any status) — history
     * view.
     */
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @GetMapping("/all")
    public ResponseEntity<List<ReturnRequestDTO>> getAll() {
        return ResponseEntity.ok(returnService.getAllForManager());
    }

    /**
     * All return requests for a specific product — useful for product audit.
     */
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @GetMapping("/product/{productId}")
    public ResponseEntity<List<ReturnRequestDTO>> getReturnsByProduct(
            @PathVariable Long productId) {
        return ResponseEntity.ok(returnService.getReturnsByProduct(productId));
    }

    /**
     * Returns pending return count for the logged-in manager — used for UI badge.
     */
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @GetMapping("/pending-count")
    public ResponseEntity<?> getPendingCount() {
        return ResponseEntity.ok(Map.of("count", returnService.countPendingForManager()));
    }

    /**
     * Manager approves return as RESTOCK — item is in good condition, goes back to
     * shelf.
     * Triggers: stockIn(RETURN) → stock increases.
     *
     * Body: { "note": "Item looks fine, returning to shelf" }
     */
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @PostMapping("/{requestId}/approve-restock")
    public ResponseEntity<?> approveAsRestock(
            @PathVariable Long requestId,
            @RequestBody(required = false) Map<String, Object> body) {
        try {
            String note = (body != null && body.containsKey("note"))
                    ? body.get("note").toString()
                    : null;
            return ResponseEntity.ok(returnService.approveAsRestock(requestId, note));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Manager approves return as DAMAGE — item is defective, no restocking.
     * Triggers: DAMAGE audit record (stock unchanged).
     *
     * Body: { "note": "Screen cracked, cannot resell" }
     */
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @PostMapping("/{requestId}/approve-damage")
    public ResponseEntity<?> approveAsDamage(
            @PathVariable Long requestId,
            @RequestBody(required = false) Map<String, Object> body) {
        try {
            String note = (body != null && body.containsKey("note"))
                    ? body.get("note").toString()
                    : null;
            return ResponseEntity.ok(returnService.approveAsDamage(requestId, note));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Manager rejects the return — no stock change, customer return refused.
     *
     * Body: { "note": "Return window exceeded" }
     */
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @PostMapping("/{requestId}/reject")
    public ResponseEntity<?> rejectReturn(
            @PathVariable Long requestId,
            @RequestBody(required = false) Map<String, Object> body) {
        try {
            String note = (body != null && body.containsKey("note"))
                    ? body.get("note").toString()
                    : null;
            return ResponseEntity.ok(returnService.rejectReturn(requestId, note));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // ── ADMIN-ONLY endpoints ──────────────────────────────────────────────────

    /**
     * Admin sees ALL return requests across all staff and managers — system-wide
     * audit view.
     * Includes full supplier, pricing, and estimated financial loss data.
     */
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/admin/all")
    public ResponseEntity<List<ReturnRequestDTO>> getAllReturnsAdmin() {
        return ResponseEntity.ok(returnService.getAllReturns());
    }

    /**
     * Admin: filter all returns by status (PENDING / APPROVED_RESTOCK /
     * APPROVED_DAMAGE / REJECTED).
     */
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/admin/status/{status}")
    public ResponseEntity<?> getReturnsByStatusAdmin(@PathVariable String status) {
        try {
            com.inventra.inventory.model.ReturnStatus s = com.inventra.inventory.model.ReturnStatus
                    .valueOf(status.toUpperCase());
            return ResponseEntity.ok(returnService.getReturnsByStatus(s));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid status: " + status));
        }
    }
}
