package com.inventra.inventory.controller;

import com.inventra.inventory.dto.SupplierDTO;
import com.inventra.inventory.model.SupplierStatus;
import com.inventra.inventory.service.SupplierService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/suppliers")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class SupplierController {

    private final SupplierService supplierService;

    // Public registration - No authentication required
    @PostMapping("/register")
    public ResponseEntity<SupplierDTO> registerSupplier(@Valid @RequestBody SupplierDTO supplierDTO) {
        SupplierDTO registered = supplierService.registerSupplier(supplierDTO);
        return new ResponseEntity<>(registered, HttpStatus.CREATED);
    }

    // Admin: Get pending suppliers
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/pending")
    public ResponseEntity<List<SupplierDTO>> getPendingSuppliers() {
        List<SupplierDTO> suppliers = supplierService.getPendingSuppliers();
        return ResponseEntity.ok(suppliers);
    }

    // Admin: Approve supplier
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/{id}/approve")
    public ResponseEntity<SupplierDTO> approveSupplier(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body) {
        String remarks = body != null ? body.get("remarks") : null;
        SupplierDTO approved = supplierService.approveSupplier(id, remarks);
        return ResponseEntity.ok(approved);
    }

    // Admin: Reject supplier
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/{id}/reject")
    public ResponseEntity<SupplierDTO> rejectSupplier(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String reason = body.get("reason");
        SupplierDTO rejected = supplierService.rejectSupplier(id, reason);
        return ResponseEntity.ok(rejected);
    }

    // Manager/Admin: Get verified suppliers (for stock in)
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @GetMapping("/verified")
    public ResponseEntity<List<SupplierDTO>> getVerifiedSuppliers() {
        List<SupplierDTO> suppliers = supplierService.getVerifiedSuppliers();
        return ResponseEntity.ok(suppliers);
    }

    // Admin: Get all suppliers
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping
    public ResponseEntity<Page<SupplierDTO>> getAllSuppliers(Pageable pageable) {
        Page<SupplierDTO> suppliers = supplierService.getAllSuppliers(pageable);
        return ResponseEntity.ok(suppliers);
    }

    // Admin: Get suppliers by status
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/status/{status}")
    public ResponseEntity<Page<SupplierDTO>> getSuppliersByStatus(
            @PathVariable SupplierStatus status,
            Pageable pageable) {
        Page<SupplierDTO> suppliers = supplierService.getSuppliersByStatus(status, pageable);
        return ResponseEntity.ok(suppliers);
    }

    // Admin/Manager: Search suppliers
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @GetMapping("/search")
    public ResponseEntity<Page<SupplierDTO>> searchSuppliers(
            @RequestParam String keyword,
            Pageable pageable) {
        Page<SupplierDTO> suppliers = supplierService.searchSuppliers(keyword, pageable);
        return ResponseEntity.ok(suppliers);
    }

    // Admin/Manager: Get supplier by ID
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @GetMapping("/{id}")
    public ResponseEntity<SupplierDTO> getSupplierById(@PathVariable Long id) {
        SupplierDTO supplier = supplierService.getSupplierById(id);
        return ResponseEntity.ok(supplier);
    }

    // Admin: Update supplier
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<SupplierDTO> updateSupplier(
            @PathVariable Long id,
            @Valid @RequestBody SupplierDTO supplierDTO) {
        SupplierDTO updated = supplierService.updateSupplier(id, supplierDTO);
        return ResponseEntity.ok(updated);
    }

    // Admin: Suspend supplier
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/{id}/suspend")
    public ResponseEntity<SupplierDTO> suspendSupplier(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String reason = body.get("reason");
        SupplierDTO suspended = supplierService.suspendSupplier(id, reason);
        return ResponseEntity.ok(suspended);
    }

    // Admin: Reactivate supplier
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/{id}/reactivate")
    public ResponseEntity<SupplierDTO> reactivateSupplier(@PathVariable Long id) {
        SupplierDTO reactivated = supplierService.reactivateSupplier(id);
        return ResponseEntity.ok(reactivated);
    }

    // Admin: Get supplier statistics
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/stats")
    public ResponseEntity<SupplierService.SupplierStats> getSupplierStats() {
        SupplierService.SupplierStats stats = supplierService.getSupplierStats();
        return ResponseEntity.ok(stats);
    }
}
