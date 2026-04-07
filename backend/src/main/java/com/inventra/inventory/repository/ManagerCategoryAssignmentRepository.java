package com.inventra.inventory.repository;

import com.inventra.inventory.model.ManagerCategoryAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ManagerCategoryAssignmentRepository extends JpaRepository<ManagerCategoryAssignment, Long> {

    // Active assignments for a given manager
    List<ManagerCategoryAssignment> findByManagerIdAndIsActiveTrue(Long managerId);

    // Active assignments made by a given admin
    List<ManagerCategoryAssignment> findByAssignedByIdAndIsActiveTrue(Long adminId);

    // Count active assignments for a manager (enforce max-3 limit)
    long countByManagerIdAndIsActiveTrue(Long managerId);

    // Check for an existing active assignment between manager and category
    Optional<ManagerCategoryAssignment> findByManagerIdAndCategoryIdAndIsActiveTrue(Long managerId, Long categoryId);

    // All assignments for a specific category
    List<ManagerCategoryAssignment> findByCategoryIdAndIsActiveTrue(Long categoryId);

    // Get all category IDs a manager is assigned to
    @Query("SELECT mca.category.id FROM ManagerCategoryAssignment mca WHERE mca.manager.id = :managerId AND mca.isActive = true")
    List<Long> findCategoryIdsByManagerId(@Param("managerId") Long managerId);

    // Get all active assignments (for admin overview)
    @Query("SELECT mca FROM ManagerCategoryAssignment mca WHERE mca.isActive = true ORDER BY mca.manager.username")
    List<ManagerCategoryAssignment> findAllActive();
}
