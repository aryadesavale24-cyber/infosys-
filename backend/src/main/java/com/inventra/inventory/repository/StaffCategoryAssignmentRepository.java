package com.inventra.inventory.repository;

import com.inventra.inventory.model.StaffCategoryAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StaffCategoryAssignmentRepository extends JpaRepository<StaffCategoryAssignment, Long> {

    // Find all active assignments for a given staff member
    List<StaffCategoryAssignment> findByStaffIdAndIsActiveTrue(Long staffId);

    // Find all active assignments under a given manager
    List<StaffCategoryAssignment> findByAssignedByIdAndIsActiveTrue(Long managerId);

    // Find all active staff assignments for a category
    List<StaffCategoryAssignment> findByCategoryIdAndIsActiveTrue(Long categoryId);

    // Check if a specific assignment already exists
    Optional<StaffCategoryAssignment> findByStaffIdAndCategoryIdAndIsActiveTrue(Long staffId, Long categoryId);

    // Get all category IDs assigned to a staff member (active only)
    @Query("SELECT sca.category.id FROM StaffCategoryAssignment sca WHERE sca.staff.id = :staffId AND sca.isActive = true")
    List<Long> findCategoryIdsByStaffId(@Param("staffId") Long staffId);

    // Check if a staff member is assigned to at least one category
    boolean existsByStaffIdAndIsActiveTrue(Long staffId);

    // Get ALL active assignments in the system (Admin view)
    List<StaffCategoryAssignment> findByIsActiveTrue();

    // Get all active assignments for staff in a set of category IDs (for
    // manager-scoped view)
    List<StaffCategoryAssignment> findByCategoryIdInAndIsActiveTrue(List<Long> categoryIds);
}
