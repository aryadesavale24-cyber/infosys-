package com.inventra.inventory.controller;

import com.inventra.inventory.dto.ManagerCategoryAssignmentDTO;
import com.inventra.inventory.service.ManagerCategoryAssignmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/manager-assignments")
@RequiredArgsConstructor
@CrossOrigin(origins = { "http://localhost:3000", "http://localhost:5173" })
public class ManagerCategoryAssignmentController {

    private final ManagerCategoryAssignmentService service;

    // ── ADMIN-ONLY endpoints ──────────────────────────────────────────────────

    /**
     * Admin assigns a category to a manager (max 3 per manager).
     * Body: { "managerId": 2, "categoryId": 1, "notes": "optional" }
     */
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/assign")
    public ResponseEntity<?> assignCategoryToManager(@RequestBody Map<String, Object> body) {
        try {
            Long managerId = Long.valueOf(body.get("managerId").toString());
            Long categoryId = Long.valueOf(body.get("categoryId").toString());
            String notes = body.containsKey("notes") ? body.get("notes").toString() : null;
            ManagerCategoryAssignmentDTO result = service.assignCategoryToManager(managerId, categoryId, notes);
            return new ResponseEntity<>(result, HttpStatus.CREATED);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Admin removes a manager-category assignment.
     */
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{assignmentId}")
    public ResponseEntity<?> removeAssignment(@PathVariable Long assignmentId) {
        try {
            service.removeAssignment(assignmentId);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Admin: see ALL manager-category assignments across all managers.
     */
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/all")
    public ResponseEntity<List<ManagerCategoryAssignmentDTO>> getAllAssignments() {
        return ResponseEntity.ok(service.getAllAssignments());
    }

    /**
     * Admin: see all assignments for a specific manager.
     */
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/manager/{managerId}")
    public ResponseEntity<List<ManagerCategoryAssignmentDTO>> getAssignmentsForManager(
            @PathVariable Long managerId) {
        return ResponseEntity.ok(service.getAssignmentsForManager(managerId));
    }

    /**
     * Admin: list all MANAGER users with their category counts.
     */
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/manager-users")
    public ResponseEntity<List<?>> getAllManagerUsers() {
        return ResponseEntity.ok(service.getAllManagerUsers());
    }

    // ── MANAGER endpoints ─────────────────────────────────────────────────────

    /**
     * Manager: see which categories they have been assigned to by Admin.
     */
    @PreAuthorize("hasRole('MANAGER')")
    @GetMapping("/my-assignments")
    public ResponseEntity<List<ManagerCategoryAssignmentDTO>> getMyAssignments() {
        return ResponseEntity.ok(service.getMyManagerAssignments());
    }

    /**
     * Manager: get just the category IDs they manage (for filtering).
     */
    @PreAuthorize("hasRole('MANAGER')")
    @GetMapping("/my-category-ids")
    public ResponseEntity<List<Long>> getMyCategoryIds() {
        return ResponseEntity.ok(service.getMyAssignedCategoryIds());
    }

    /**
     * Manager: get all products in their assigned categories only.
     * They CANNOT see products outside their categories.
     */
    @PreAuthorize("hasRole('MANAGER')")
    @GetMapping("/my-products")
    public ResponseEntity<List<?>> getMyProducts() {
        return ResponseEntity.ok(service.getMyProducts());
    }

    /**
     * Manager: get other managers who share any of the same categories.
     * Helps the manager know who else handles the same territory (coordination).
     */
    @PreAuthorize("hasRole('MANAGER')")
    @GetMapping("/co-managers")
    public ResponseEntity<List<?>> getCoManagers() {
        return ResponseEntity.ok(service.getCoManagers());
    }
}
