package com.inventra.inventory.repository;

import com.inventra.inventory.model.Supplier;
import com.inventra.inventory.model.SupplierStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SupplierRepository extends JpaRepository<Supplier, Long> {

    // Find by email
    Optional<Supplier> findByEmail(String email);

    // Find by GST number
    Optional<Supplier> findByGstNumber(String gstNumber);

    // Find by trade license
    Optional<Supplier> findByTradeLicenseNumber(String tradeLicenseNumber);

    // Check if email exists
    boolean existsByEmail(String email);

    // Check if GST exists
    boolean existsByGstNumber(String gstNumber);

    // Check if trade license exists
    boolean existsByTradeLicenseNumber(String tradeLicenseNumber);

    // Find by status
    Page<Supplier> findByStatus(SupplierStatus status, Pageable pageable);

    // Find all verified suppliers
    @Query("SELECT s FROM Supplier s WHERE s.status = 'APPROVED' AND s.isActive = true")
    List<Supplier> findAllVerifiedSuppliers();

    // Find pending suppliers (for admin review)
    @Query("SELECT s FROM Supplier s WHERE s.status = 'PENDING' ORDER BY s.createdAt ASC")
    List<Supplier> findPendingSuppliers();

    // Search suppliers
    @Query("SELECT s FROM Supplier s WHERE " +
            "LOWER(s.companyName) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
            "LOWER(s.contactPersonName) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
            "LOWER(s.email) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
            "s.gstNumber LIKE CONCAT('%', :keyword, '%')")
    Page<Supplier> searchSuppliers(@Param("keyword") String keyword, Pageable pageable);

    // Find active suppliers
    Page<Supplier> findByIsActiveTrue(Pageable pageable);

    // Find by city
    Page<Supplier> findByCity(String city, Pageable pageable);

    // Find by state
    Page<Supplier> findByState(String state, Pageable pageable);

    // Count by status
    long countByStatus(SupplierStatus status);
}
