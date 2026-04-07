package com.inventra.inventory.controller;

import com.inventra.inventory.dto.StaffCategoryAssignmentDTO;
import com.inventra.inventory.service.StaffCategoryAssignmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/staff-assignments")
@RequiredArgsConstructor
@CrossOrigin(origins = { "http://localhost:3000", "http://localhost:5173" })
public class StaffCategoryAssignmentController {

    private final StaffCategoryAssignmentService assignmentService;

    // ── MANAGER/ADMIN endpoints ───────────────────────────────────────────────

    /**
     * Assign a category to a staff member.
     * Body: { "staffId": 5, "categoryId": 2, "notes": "optional note" }
     */
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @PostMapping("/assign")
    public ResponseEntity<?> assignCategory(
            @RequestBody Map<String, Object> body) {
        try {
            Long staffId = Long.valueOf(body.get("staffId").toString());
            Long categoryId = Long.valueOf(body.get("categoryId").toString());
            String notes = body.containsKey("notes") ? body.get("notes").toString() : null;
            return new ResponseEntity<>(assignmentService.assignCategory(staffId, categoryId, notes),
                    HttpStatus.CREATED);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Deactivate/remove an assignment by its ID.
     */
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @DeleteMapping("/{assignmentId}")
    public ResponseEntity<Void> removeAssignment(@PathVariable Long assignmentId) {
        assignmentService.removeAssignment(assignmentId);
        return ResponseEntity.noContent().build();
    }

    /**
     * See all assignments made by the currently logged-in manager.
     */
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @GetMapping("/my-assignments")
    public ResponseEntity<List<StaffCategoryAssignmentDTO>> getMyAssignments() {
        return ResponseEntity.ok(assignmentService.getMyAssignments());
    }

    /**
     * See all category assignments for a specific staff user.
     */
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @GetMapping("/staff/{staffId}")
    public ResponseEntity<List<StaffCategoryAssignmentDTO>> getAssignmentsForStaff(
            @PathVariable Long staffId) {
        return ResponseEntity.ok(assignmentService.getAssignmentsForStaff(staffId));
    }

    /**
     * List all STAFF-role users (for populating the assignment dropdown).
     */
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @GetMapping("/staff-users")
    public ResponseEntity<List<?>> getAllStaffUsers() {
        return ResponseEntity.ok(assignmentService.getAllStaffUsers());
    }

    /**
     * Get the categories the caller (Manager) is allowed to assign.
     * ADMIN → all active categories | MANAGER → only their Admin-granted
     * categories.
     */
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @GetMapping("/assignable-categories")
    public ResponseEntity<List<?>> getAssignableCategories() {
        return ResponseEntity.ok(assignmentService.getAssignableCategories());
    }

    // ── STAFF endpoints ───────────────────────────────────────────────────────

    /**
     * Get products in the categories assigned to the current staff member.
     * Used to populate the Stock-Out form so staff only see their products.
     */
    @PreAuthorize("hasRole('STAFF')")
    @GetMapping("/my-products")
    public ResponseEntity<List<?>> getMyProducts() {
        return ResponseEntity.ok(assignmentService.getProductsForCurrentStaff());
    }

    /**
     * Get the category IDs assigned to the current staff member.
     */
    @PreAuthorize("hasRole('STAFF')")
    @GetMapping("/my-categories")
    public ResponseEntity<List<Long>> getMyCategoryIds() {
        return ResponseEntity.ok(assignmentService.getAssignedCategoryIds());
    }

    /**
     * Get the full assignment details for the current staff member.
     */
    @PreAuthorize("hasRole('STAFF')")
    @GetMapping("/my-staff-assignments")
    public ResponseEntity<List<StaffCategoryAssignmentDTO>> getMyStaffAssignments() {
        return ResponseEntity.ok(assignmentService.getMyStaffAssignments());
    }
}
