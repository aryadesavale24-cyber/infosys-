package com.inventra.inventory.service;

import com.inventra.inventory.dto.StaffCategoryAssignmentDTO;
import com.inventra.inventory.model.*;
import com.inventra.inventory.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StaffCategoryAssignmentService {

    private final StaffCategoryAssignmentRepository assignmentRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final ManagerCategoryAssignmentRepository managerCatRepo;

    // ── Manager: Assign a category to a staff member ──────────────────────────
    @Transactional
    public StaffCategoryAssignmentDTO assignCategory(Long staffId, Long categoryId, String notes) {
        User manager = getCurrentUser();

        // ── Guard: MANAGER can only assign categories they themselves own ──────
        // ADMIN role bypasses this check (has full access)
        if (manager.getRole() == Role.MANAGER) {
            List<Long> managerCategoryIds = managerCatRepo.findCategoryIdsByManagerId(manager.getId());
            if (!managerCategoryIds.contains(categoryId)) {
                throw new RuntimeException(
                        "You are not assigned to this category. " +
                                "You can only assign categories that Admin has granted you.");
            }
        }

        User staff = userRepository.findById(staffId)
                .orElseThrow(() -> new RuntimeException("Staff user not found"));

        if (staff.getRole() != Role.STAFF) {
            throw new RuntimeException("User is not a STAFF member");
        }

        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new RuntimeException("Category not found"));

        // Prevent duplicate active assignment
        assignmentRepository.findByStaffIdAndCategoryIdAndIsActiveTrue(staffId, categoryId)
                .ifPresent(existing -> {
                    throw new RuntimeException("Staff is already assigned to this category");
                });

        StaffCategoryAssignment assignment = new StaffCategoryAssignment();
        assignment.setStaff(staff);
        assignment.setCategory(category);
        assignment.setAssignedBy(manager);
        assignment.setIsActive(true);
        assignment.setNotes(notes);

        return toDTO(assignmentRepository.save(assignment));
    }

    // ── Manager: Remove (deactivate) an assignment ────────────────────────────
    @Transactional
    public void removeAssignment(Long assignmentId) {
        StaffCategoryAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Assignment not found"));
        assignment.setIsActive(false);
        assignmentRepository.save(assignment);
    }

    // ── Manager: Get all assignments visible to this manager ─────────────────
    // ADMIN → all active assignments in the system
    // MANAGER → all active assignments for staff in their category scope
    public List<StaffCategoryAssignmentDTO> getMyAssignments() {
        User caller = getCurrentUser();

        if (caller.getRole() == Role.ADMIN) {
            // Admin sees every active assignment across the system
            return assignmentRepository.findByIsActiveTrue()
                    .stream().map(this::toDTO).collect(Collectors.toList());
        }

        // Manager: fetch assignments for staff in their assigned categories
        List<Long> myCategoryIds = managerCatRepo.findCategoryIdsByManagerId(caller.getId());
        if (myCategoryIds.isEmpty()) {
            return List.of();
        }

        return assignmentRepository.findByCategoryIdInAndIsActiveTrue(myCategoryIds)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    // ── Manager/Admin: Get all assignments for a specific staff member ─────────
    public List<StaffCategoryAssignmentDTO> getAssignmentsForStaff(Long staffId) {
        return assignmentRepository.findByStaffIdAndIsActiveTrue(staffId)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    // ── Manager/Admin: Get all staff users ─────────────────────────────────────
    public List<?> getAllStaffUsers() {
        return userRepository.findByRole(Role.STAFF).stream()
                .map(u -> new java.util.HashMap<String, Object>() {
                    {
                        put("id", u.getId());
                        put("username", u.getUsername());
                        put("fullName", u.getFullName());
                        put("email", u.getEmail());
                        put("enabled", u.getEnabled());
                    }
                })
                .collect(Collectors.toList());
    }

    // ── Manager/Admin: Get categories this caller can assign to staff ──────────
    // ADMIN → all active categories
    // MANAGER → only the categories Admin has granted to them
    public List<?> getAssignableCategories() {
        User caller = getCurrentUser();
        if (caller.getRole() == Role.ADMIN) {
            return categoryRepository.findByIsActive(true).stream()
                    .map(c -> new java.util.HashMap<String, Object>() {
                        {
                            put("id", c.getId());
                            put("name", c.getName());
                        }
                    })
                    .collect(Collectors.toList());
        }
        // Manager: only their granted categories
        List<Long> catIds = managerCatRepo.findCategoryIdsByManagerId(caller.getId());

        // ⚠ IMPORTANT: findAllById([]) returns ALL rows in Spring Data JPA —
        // must guard the empty case explicitly to prevent showing all categories.
        if (catIds.isEmpty()) {
            return List.of();
        }

        return categoryRepository.findAllById(catIds).stream()
                .map(c -> new java.util.HashMap<String, Object>() {
                    {
                        put("id", c.getId());
                        put("name", c.getName());
                    }
                })
                .collect(Collectors.toList());
    }

    // ── Staff: Get products I am allowed to stock out ─────────────────────────
    public List<?> getProductsForCurrentStaff() {
        User staff = getCurrentUser();
        List<Long> categoryIds = assignmentRepository.findCategoryIdsByStaffId(staff.getId());

        if (categoryIds.isEmpty()) {
            return List.of(); // No assignments → no products
        }

        return productRepository.findByCategoryIds(categoryIds).stream()
                .map(p -> new java.util.HashMap<String, Object>() {
                    {
                        put("id", p.getId());
                        put("name", p.getName());
                        put("sku", p.getSku());
                        put("currentStock", p.getCurrentStock());
                        put("sellingPrice", p.getSellingPrice());
                        put("categoryId", p.getCategory() != null ? p.getCategory().getId() : null);
                        put("categoryName", p.getCategory() != null ? p.getCategory().getName() : null);
                        put("unit", p.getUnitOfMeasure());
                    }
                })
                .collect(Collectors.toList());
    }

    // ── Staff: Get assigned category IDs ─────────────────────────────────────
    public List<Long> getAssignedCategoryIds() {
        User staff = getCurrentUser();
        return assignmentRepository.findCategoryIdsByStaffId(staff.getId());
    }

    // ── Staff: Get my assignments ─────────────────────────────────────────────
    public List<StaffCategoryAssignmentDTO> getMyStaffAssignments() {
        User staff = getCurrentUser();
        return assignmentRepository.findByStaffIdAndIsActiveTrue(staff.getId())
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Current user not found"));
    }

    private StaffCategoryAssignmentDTO toDTO(StaffCategoryAssignment a) {
        StaffCategoryAssignmentDTO dto = new StaffCategoryAssignmentDTO();
        dto.setId(a.getId());
        dto.setStaffId(a.getStaff().getId());
        dto.setStaffUsername(a.getStaff().getUsername());
        dto.setStaffFullName(a.getStaff().getFullName());
        dto.setStaffEmail(a.getStaff().getEmail());
        dto.setCategoryId(a.getCategory().getId());
        dto.setCategoryName(a.getCategory().getName());
        dto.setAssignedById(a.getAssignedBy().getId());
        dto.setAssignedByUsername(a.getAssignedBy().getUsername());
        dto.setAssignedAt(a.getAssignedAt());
        dto.setIsActive(a.getIsActive());
        dto.setNotes(a.getNotes());
        return dto;
    }
}
