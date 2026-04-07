package com.inventra.inventory.service;

import com.inventra.inventory.dto.SupplierDTO;
import com.inventra.inventory.exception.DuplicateResourceException;
import com.inventra.inventory.exception.ResourceNotFoundException;
import com.inventra.inventory.model.Supplier;
import com.inventra.inventory.model.SupplierStatus;
import com.inventra.inventory.model.User;
import com.inventra.inventory.repository.SupplierRepository;
import com.inventra.inventory.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SupplierService {

    private final SupplierRepository supplierRepository;
    private final UserRepository userRepository;
    private final RealtimeEventService realtimeEventService;

    // Public Registration - No authentication required
    @Transactional
    public SupplierDTO registerSupplier(SupplierDTO supplierDTO) {
        // Validate unique constraints
        if (supplierRepository.existsByEmail(supplierDTO.getEmail())) {
            throw new DuplicateResourceException("Email already registered");
        }
        if (supplierRepository.existsByGstNumber(supplierDTO.getGstNumber())) {
            throw new DuplicateResourceException("GST number already registered");
        }
        if (supplierRepository.existsByTradeLicenseNumber(supplierDTO.getTradeLicenseNumber())) {
            throw new DuplicateResourceException("Trade license number already registered");
        }

        Supplier supplier = convertToEntity(supplierDTO);
        supplier.setStatus(SupplierStatus.PENDING);
        supplier.setCreatedAt(LocalDateTime.now());
        supplier.setIsActive(true);

        Long currentUserId = getCurrentUserId();
        if (currentUserId != null) {
            userRepository.findById(currentUserId).ifPresent(supplier::setRequestedBy);
        }

        Supplier savedSupplier = supplierRepository.save(supplier);
        realtimeEventService.supplierUpdated("REGISTERED", savedSupplier.getId());
        return convertToDTO(savedSupplier);
    }

    // Admin: Get all pending suppliers for review
    @Transactional(readOnly = true)
    public List<SupplierDTO> getPendingSuppliers() {
        return supplierRepository.findPendingSuppliers().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    // Admin: Approve supplier
    @Transactional
    public SupplierDTO approveSupplier(Long supplierId, String adminRemarks) {
        Supplier supplier = supplierRepository.findById(supplierId)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found"));

        if (supplier.getStatus() != SupplierStatus.PENDING) {
            throw new IllegalStateException("Only pending suppliers can be approved");
        }

        supplier.setStatus(SupplierStatus.APPROVED);
        supplier.setAdminRemarks(adminRemarks);
        supplier.setApprovedAt(LocalDateTime.now());
        supplier.setReviewedAt(LocalDateTime.now());
        supplier.setReviewedBy(getCurrentUserId());

        Supplier updatedSupplier = supplierRepository.save(supplier);
        realtimeEventService.supplierUpdated("APPROVED", updatedSupplier.getId());
        return convertToDTO(updatedSupplier);
    }

    // Admin: Reject supplier
    @Transactional
    public SupplierDTO rejectSupplier(Long supplierId, String rejectionReason) {
        Supplier supplier = supplierRepository.findById(supplierId)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found"));

        if (supplier.getStatus() != SupplierStatus.PENDING) {
            throw new IllegalStateException("Only pending suppliers can be rejected");
        }

        supplier.setStatus(SupplierStatus.REJECTED);
        supplier.setRejectionReason(rejectionReason);
        supplier.setReviewedAt(LocalDateTime.now());
        supplier.setReviewedBy(getCurrentUserId());

        Supplier updatedSupplier = supplierRepository.save(supplier);
        realtimeEventService.supplierUpdated("REJECTED", updatedSupplier.getId());
        return convertToDTO(updatedSupplier);
    }

    // Get all verified suppliers (for Manager to use when adding stock)
    @Transactional(readOnly = true)
    public List<SupplierDTO> getVerifiedSuppliers() {
        return supplierRepository.findAllVerifiedSuppliers().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    // Get supplier by ID
    @Transactional(readOnly = true)
    public SupplierDTO getSupplierById(Long id) {
        Supplier supplier = supplierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found"));
        return convertToDTO(supplier);
    }

    // Get all suppliers with pagination
    @Transactional(readOnly = true)
    public Page<SupplierDTO> getAllSuppliers(Pageable pageable) {
        return supplierRepository.findAll(pageable)
                .map(this::convertToDTO);
    }

    // Get suppliers by status
    @Transactional(readOnly = true)
    public Page<SupplierDTO> getSuppliersByStatus(SupplierStatus status, Pageable pageable) {
        return supplierRepository.findByStatus(status, pageable)
                .map(this::convertToDTO);
    }

    // Search suppliers
    @Transactional(readOnly = true)
    public Page<SupplierDTO> searchSuppliers(String keyword, Pageable pageable) {
        return supplierRepository.searchSuppliers(keyword, pageable)
                .map(this::convertToDTO);
    }

    // Update supplier (Admin only)
    @Transactional
    public SupplierDTO updateSupplier(Long id, SupplierDTO supplierDTO) {
        Supplier supplier = supplierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found"));

        // Update fields
        supplier.setCompanyName(supplierDTO.getCompanyName());
        supplier.setContactPersonName(supplierDTO.getContactPersonName());
        supplier.setPhoneNumber(supplierDTO.getPhoneNumber());
        supplier.setAlternatePhone(supplierDTO.getAlternatePhone());
        supplier.setAddress(supplierDTO.getAddress());
        supplier.setCity(supplierDTO.getCity());
        supplier.setState(supplierDTO.getState());
        supplier.setPincode(supplierDTO.getPincode());
        supplier.setBusinessDescription(supplierDTO.getBusinessDescription());
        supplier.setProductsSupplied(supplierDTO.getProductsSupplied());
        supplier.setYearsInBusiness(supplierDTO.getYearsInBusiness());
        supplier.setUpdatedAt(LocalDateTime.now());

        Supplier updatedSupplier = supplierRepository.save(supplier);
        realtimeEventService.supplierUpdated("UPDATED", updatedSupplier.getId());
        return convertToDTO(updatedSupplier);
    }

    // Suspend supplier (Admin only)
    @Transactional
    public SupplierDTO suspendSupplier(Long id, String reason) {
        Supplier supplier = supplierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found"));

        supplier.setStatus(SupplierStatus.SUSPENDED);
        supplier.setIsActive(false);
        supplier.setAdminRemarks(reason);
        supplier.setUpdatedAt(LocalDateTime.now());

        Supplier updatedSupplier = supplierRepository.save(supplier);
        realtimeEventService.supplierUpdated("SUSPENDED", updatedSupplier.getId());
        return convertToDTO(updatedSupplier);
    }

    // Reactivate supplier (Admin only)
    @Transactional
    public SupplierDTO reactivateSupplier(Long id) {
        Supplier supplier = supplierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found"));

        if (supplier.getStatus() != SupplierStatus.APPROVED) {
            throw new IllegalStateException("Only approved suppliers can be reactivated");
        }

        supplier.setIsActive(true);
        supplier.setUpdatedAt(LocalDateTime.now());

        Supplier updatedSupplier = supplierRepository.save(supplier);
        realtimeEventService.supplierUpdated("REACTIVATED", updatedSupplier.getId());
        return convertToDTO(updatedSupplier);
    }

    // Get supplier statistics
    @Transactional(readOnly = true)
    public SupplierStats getSupplierStats() {
        long pending = supplierRepository.countByStatus(SupplierStatus.PENDING);
        long approved = supplierRepository.countByStatus(SupplierStatus.APPROVED);
        long rejected = supplierRepository.countByStatus(SupplierStatus.REJECTED);
        long suspended = supplierRepository.countByStatus(SupplierStatus.SUSPENDED);

        return new SupplierStats(pending, approved, rejected, suspended);
    }

    // Helper methods
    private Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof User) {
            return ((User) authentication.getPrincipal()).getId();
        }
        return null;
    }

    private SupplierDTO convertToDTO(Supplier supplier) {
        SupplierDTO dto = new SupplierDTO();
        dto.setId(supplier.getId());
        dto.setCompanyName(supplier.getCompanyName());
        dto.setContactPersonName(supplier.getContactPersonName());
        dto.setEmail(supplier.getEmail());
        dto.setPhoneNumber(supplier.getPhoneNumber());
        dto.setAlternatePhone(supplier.getAlternatePhone());
        dto.setAddress(supplier.getAddress());
        dto.setCity(supplier.getCity());
        dto.setState(supplier.getState());
        dto.setPincode(supplier.getPincode());
        dto.setCountry(supplier.getCountry());
        dto.setGstNumber(supplier.getGstNumber());
        dto.setGstCertificatePath(supplier.getGstCertificatePath());
        dto.setTradeLicenseNumber(supplier.getTradeLicenseNumber());
        dto.setTradeLicensePath(supplier.getTradeLicensePath());
        dto.setPanNumber(supplier.getPanNumber());
        dto.setPanCardPath(supplier.getPanCardPath());
        dto.setBankName(supplier.getBankName());
        dto.setAccountNumber(supplier.getAccountNumber());
        dto.setIfscCode(supplier.getIfscCode());
        dto.setAccountHolderName(supplier.getAccountHolderName());
        dto.setBusinessDescription(supplier.getBusinessDescription());
        dto.setProductsSupplied(supplier.getProductsSupplied());
        dto.setYearsInBusiness(supplier.getYearsInBusiness());
        dto.setStatus(supplier.getStatus());
        dto.setAdminRemarks(supplier.getAdminRemarks());
        dto.setRejectionReason(supplier.getRejectionReason());
        dto.setCreatedAt(supplier.getCreatedAt());
        dto.setApprovedAt(supplier.getApprovedAt());
        dto.setReviewedAt(supplier.getReviewedAt());
        dto.setRating(supplier.getRating());
        dto.setTotalOrders(supplier.getTotalOrders());
        dto.setIsActive(supplier.getIsActive());

        // Get reviewer username if available
        if (supplier.getReviewedBy() != null) {
            userRepository.findById(supplier.getReviewedBy())
                    .ifPresent(user -> dto.setReviewedByUsername(user.getUsername()));
        }

        if (supplier.getRequestedBy() != null) {
            dto.setRequestedById(supplier.getRequestedBy().getId());
            dto.setRequestedByUsername(supplier.getRequestedBy().getUsername());
            dto.setRequestedByFullName(supplier.getRequestedBy().getFullName());
        }

        return dto;
    }

    private Supplier convertToEntity(SupplierDTO dto) {
        Supplier supplier = new Supplier();
        supplier.setCompanyName(dto.getCompanyName());
        supplier.setContactPersonName(dto.getContactPersonName());
        supplier.setEmail(dto.getEmail());
        supplier.setPhoneNumber(dto.getPhoneNumber());
        supplier.setAlternatePhone(dto.getAlternatePhone());
        supplier.setAddress(dto.getAddress());
        supplier.setCity(dto.getCity());
        supplier.setState(dto.getState());
        supplier.setPincode(dto.getPincode());
        supplier.setCountry(dto.getCountry() != null ? dto.getCountry() : "India");
        supplier.setGstNumber(dto.getGstNumber());
        supplier.setGstCertificatePath(dto.getGstCertificatePath());
        supplier.setTradeLicenseNumber(dto.getTradeLicenseNumber());
        supplier.setTradeLicensePath(dto.getTradeLicensePath());
        supplier.setPanNumber(dto.getPanNumber());
        supplier.setPanCardPath(dto.getPanCardPath());
        supplier.setBankName(dto.getBankName());
        supplier.setAccountNumber(dto.getAccountNumber());
        supplier.setIfscCode(dto.getIfscCode());
        supplier.setAccountHolderName(dto.getAccountHolderName());
        supplier.setBusinessDescription(dto.getBusinessDescription());
        supplier.setProductsSupplied(dto.getProductsSupplied());
        supplier.setYearsInBusiness(dto.getYearsInBusiness());
        return supplier;
    }

    // Inner class for statistics
    public static class SupplierStats {
        public final long pending;
        public final long approved;
        public final long rejected;
        public final long suspended;

        public SupplierStats(long pending, long approved, long rejected, long suspended) {
            this.pending = pending;
            this.approved = approved;
            this.rejected = rejected;
            this.suspended = suspended;
        }
    }
}
