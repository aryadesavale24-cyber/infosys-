package com.inventra.inventory.service;

import com.inventra.inventory.dto.ManagerCategoryAssignmentDTO;
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
public class ManagerCategoryAssignmentService {

    private static final int MAX_CATEGORIES_PER_MANAGER = 3;

    private final ManagerCategoryAssignmentRepository managerCatRepo;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;

    // ── ADMIN: Assign a category to a manager ─────────────────────────────────
    @Transactional
    public ManagerCategoryAssignmentDTO assignCategoryToManager(Long managerId, Long categoryId, String notes) {
        User admin = getCurrentUser();

        User manager = userRepository.findById(managerId)
                .orElseThrow(() -> new RuntimeException("Manager not found"));

        if (manager.getRole() != Role.MANAGER) {
            throw new RuntimeException("Target user is not a MANAGER");
        }

        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new RuntimeException("Category not found"));

        // Duplicate check
        managerCatRepo.findByManagerIdAndCategoryIdAndIsActiveTrue(managerId, categoryId)
                .ifPresent(e -> {
                    throw new RuntimeException("Manager is already assigned to this category");
                });

        // ── Enforce max-3 limit ────────────────────────────────────────────────
        long currentCount = managerCatRepo.countByManagerIdAndIsActiveTrue(managerId);
        if (currentCount >= MAX_CATEGORIES_PER_MANAGER) {
            throw new RuntimeException(
                    "Manager '" + manager.getUsername() + "' already manages " + MAX_CATEGORIES_PER_MANAGER +
                            " categories (the maximum allowed). Remove an existing assignment first.");
        }

        ManagerCategoryAssignment assignment = new ManagerCategoryAssignment();
        assignment.setManager(manager);
        assignment.setCategory(category);
        assignment.setAssignedBy(admin);
        assignment.setIsActive(true);
        assignment.setNotes(notes);

        return toDTO(managerCatRepo.save(assignment));
    }

    // ── ADMIN: Remove a manager-category assignment ────────────────────────────
    @Transactional
    public void removeAssignment(Long assignmentId) {
        ManagerCategoryAssignment assignment = managerCatRepo.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Assignment not found"));
        assignment.setIsActive(false);
        managerCatRepo.save(assignment);
    }

    // ── ADMIN: Get all active assignments (overview) ───────────────────────────
    public List<ManagerCategoryAssignmentDTO> getAllAssignments() {
        return managerCatRepo.findAllActive().stream().map(this::toDTO).collect(Collectors.toList());
    }

    // ── ADMIN/MANAGER: Get assignments for a specific manager ──────────────────
    public List<ManagerCategoryAssignmentDTO> getAssignmentsForManager(Long managerId) {
        return managerCatRepo.findByManagerIdAndIsActiveTrue(managerId)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    // ── ADMIN: Get all manager-role users ─────────────────────────────────────
    public List<?> getAllManagerUsers() {
        return userRepository.findByRole(Role.MANAGER).stream()
                .map(u -> {
                    long assignedCount = managerCatRepo.countByManagerIdAndIsActiveTrue(u.getId());
                    return new java.util.HashMap<String, Object>() {
                        {
                            put("id", u.getId());
                            put("username", u.getUsername());
                            put("fullName", u.getFullName());
                            put("email", u.getEmail());
                            put("assignedCategoryCount", assignedCount);
                            put("canAssignMore", assignedCount < MAX_CATEGORIES_PER_MANAGER);
                            put("maxCategories", MAX_CATEGORIES_PER_MANAGER);
                        }
                    };
                })
                .collect(Collectors.toList());
    }

    // ── MANAGER: Get categories assigned to the current manager ───────────────
    public List<ManagerCategoryAssignmentDTO> getMyManagerAssignments() {
        User manager = getCurrentUser();
        return managerCatRepo.findByManagerIdAndIsActiveTrue(manager.getId())
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    // ── MANAGER: Get category IDs the current manager can work with ────────────
    public List<Long> getMyAssignedCategoryIds() {
        User manager = getCurrentUser();
        return managerCatRepo.findCategoryIdsByManagerId(manager.getId());
    }

    // ── MANAGER: Get products belonging to the manager's assigned categories ───
    // A manager should only see inventory data for their own categories.
    public List<?> getMyProducts() {
        User manager = getCurrentUser();
        List<Long> categoryIds = managerCatRepo.findCategoryIdsByManagerId(manager.getId());

        if (categoryIds.isEmpty()) {
            return java.util.Collections.emptyList();
        }

        return productRepository.findByCategoryIds(categoryIds).stream()
                .map(p -> new java.util.HashMap<String, Object>() {
                    {
                        put("id", p.getId());
                        put("name", p.getName());
                        put("sku", p.getSku());
                        put("brand", p.getBrand());
                        put("manufacturer", p.getManufacturer());
                        put("currentStock", p.getCurrentStock());
                        put("reorderLevel", p.getReorderLevel());
                        put("maxStockLevel", p.getMaxStockLevel());
                        put("costPrice", p.getCostPrice());
                        put("sellingPrice", p.getSellingPrice());
                        put("status", p.getStatus() != null ? p.getStatus().name() : null);
                        put("categoryId", p.getCategory() != null ? p.getCategory().getId() : null);
                        put("categoryName", p.getCategory() != null ? p.getCategory().getName() : null);
                        put("unit", p.getUnitOfMeasure());
                        put("isLowStock", p.isLowStock());
                        put("isOutOfStock", p.isOutOfStock());
                    }
                })
                .collect(Collectors.toList());
    }

    // ── MANAGER: Get co-managers sharing the same categories ─────────────────
    // So a manager knows who else is responsible for their categories,
    // helping avoid confusion and allowing them to coordinate.
    public List<?> getCoManagers() {
        User me = getCurrentUser();
        List<Long> myCategoryIds = managerCatRepo.findCategoryIdsByManagerId(me.getId());

        if (myCategoryIds.isEmpty()) {
            return java.util.Collections.emptyList();
        }

        // For each of my categories, find ALL OTHER managers assigned to that category
        return myCategoryIds.stream()
                .flatMap(catId -> {
                    List<ManagerCategoryAssignment> others = managerCatRepo.findByCategoryIdAndIsActiveTrue(catId);
                    return others.stream()
                            .filter(a -> !a.getManager().getId().equals(me.getId()))
                            .map(a -> new java.util.HashMap<String, Object>() {
                                {
                                    put("categoryId", a.getCategory().getId());
                                    put("categoryName", a.getCategory().getName());
                                    put("managerId", a.getManager().getId());
                                    put("managerUsername", a.getManager().getUsername());
                                    put("managerFullName", a.getManager().getFullName());
                                    put("managerEmail", a.getManager().getEmail());
                                    put("assignedAt", a.getAssignedAt());
                                }
                            });
                })
                .distinct()
                .collect(Collectors.toList());
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────
    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Current user not found"));
    }

    private ManagerCategoryAssignmentDTO toDTO(ManagerCategoryAssignment a) {
        ManagerCategoryAssignmentDTO dto = new ManagerCategoryAssignmentDTO();
        dto.setId(a.getId());
        dto.setManagerId(a.getManager().getId());
        dto.setManagerUsername(a.getManager().getUsername());
        dto.setManagerFullName(a.getManager().getFullName());
        dto.setManagerEmail(a.getManager().getEmail());
        dto.setCategoryId(a.getCategory().getId());
        dto.setCategoryName(a.getCategory().getName());
        dto.setAssignedById(a.getAssignedBy().getId());
        dto.setAssignedByUsername(a.getAssignedBy().getUsername());
        dto.setAssignedAt(a.getAssignedAt());
        dto.setIsActive(a.getIsActive());
        dto.setNotes(a.getNotes());
        dto.setTotalAssignedCount(
                managerCatRepo.countByManagerIdAndIsActiveTrue(a.getManager().getId()));
        return dto;
    }
}
