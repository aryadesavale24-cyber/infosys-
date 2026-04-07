package com.inventra.inventory.repository;

import com.inventra.inventory.model.Product;
import com.inventra.inventory.model.ProductStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    // Find by unique identifiers
    Optional<Product> findBySku(String sku);

    Optional<Product> findByBarcode(String barcode);

    // Check existence
    boolean existsBySku(String sku);

    boolean existsByBarcode(String barcode);

    // Find with pessimistic lock for concurrency control
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Product p WHERE p.id = :id")
    Optional<Product> findByIdWithLock(@Param("id") Long id);

    // Find by status
    Page<Product> findByStatus(ProductStatus status, Pageable pageable);

    Page<Product> findByStatusAndIsDeleted(ProductStatus status, Boolean isDeleted, Pageable pageable);

    // Find by category
    Page<Product> findByCategoryId(Long categoryId, Pageable pageable);

    Page<Product> findBySubCategoryId(Long subCategoryId, Pageable pageable);

    // Low stock products
    @Query("SELECT p FROM Product p WHERE p.currentStock <= p.reorderLevel AND p.status = 'ACTIVE' AND p.isDeleted = false")
    List<Product> findLowStockProducts();

    // Out of stock products
    @Query("SELECT p FROM Product p WHERE p.currentStock = 0 AND p.status = 'ACTIVE' AND p.isDeleted = false")
    List<Product> findOutOfStockProducts();

    // Overstock products
    @Query("SELECT p FROM Product p WHERE p.maxStockLevel IS NOT NULL AND p.currentStock > p.maxStockLevel AND p.status = 'ACTIVE' AND p.isDeleted = false")
    List<Product> findOverstockProducts();

    // Search products
    @Query("SELECT p FROM Product p WHERE " +
            "(LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
            "LOWER(p.sku) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
            "LOWER(p.barcode) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
            "LOWER(p.description) LIKE LOWER(CONCAT('%', :keyword, '%'))) AND " +
            "p.isDeleted = false")
    Page<Product> searchProducts(@Param("keyword") String keyword, Pageable pageable);

    // Find active products
    @Query("SELECT p FROM Product p WHERE p.isDeleted = false")
    Page<Product> findAllActive(Pageable pageable);

    // Find by brand
    Page<Product> findByBrandAndIsDeleted(String brand, Boolean isDeleted, Pageable pageable);

    // Count by status
    long countByStatus(ProductStatus status);

    long countByStatusAndIsDeleted(ProductStatus status, Boolean isDeleted);

    // Find products in a set of categories (for staff-category filtering)
    @Query("SELECT p FROM Product p WHERE p.category.id IN :categoryIds AND p.isDeleted = false AND p.status = 'ACTIVE'")
    List<Product> findByCategoryIds(@Param("categoryIds") List<Long> categoryIds);

    // ── Analytics queries ─────────────────────────────────────────────────

    // Total inventory value: sum(costPrice * currentStock) for active products
    @Query("SELECT COALESCE(SUM(p.costPrice * p.currentStock), 0) FROM Product p WHERE p.isDeleted = false AND p.status = 'ACTIVE'")
    java.math.BigDecimal getTotalInventoryValue();

    // Total inventory value scoped to specific categories
    @Query("SELECT COALESCE(SUM(p.costPrice * p.currentStock), 0) FROM Product p WHERE p.isDeleted = false AND p.status = 'ACTIVE' AND p.category.id IN :categoryIds")
    java.math.BigDecimal getTotalInventoryValueByCategories(@Param("categoryIds") List<Long> categoryIds);

    // Count low stock products scoped to categories
    @Query("SELECT COUNT(p) FROM Product p WHERE p.currentStock <= p.reorderLevel AND p.status = 'ACTIVE' AND p.isDeleted = false AND p.category.id IN :categoryIds")
    long countLowStockByCategories(@Param("categoryIds") List<Long> categoryIds);

    // Count out-of-stock products scoped to categories
    @Query("SELECT COUNT(p) FROM Product p WHERE p.currentStock = 0 AND p.status = 'ACTIVE' AND p.isDeleted = false AND p.category.id IN :categoryIds")
    long countOutOfStockByCategories(@Param("categoryIds") List<Long> categoryIds);

    // Products with no sales in a given period (slow movers) — all
    @Query(value = "SELECT p.* FROM products p " +
            "WHERE p.is_deleted = false AND p.status = 'ACTIVE' " +
            "AND p.id NOT IN (" +
            "  SELECT DISTINCT st.product_id FROM stock_transactions st " +
            "  WHERE st.transaction_type = 'SALE' AND st.transaction_date >= :since" +
            ") ORDER BY p.current_stock ASC", nativeQuery = true)
    List<Product> findSlowMovers(@Param("since") java.time.LocalDateTime since);

    // Products with no sales in a given period (slow movers) — category scoped
    @Query(value = "SELECT p.* FROM products p " +
            "WHERE p.is_deleted = false AND p.status = 'ACTIVE' AND p.category_id IN (:categoryIds) " +
            "AND p.id NOT IN (" +
            "  SELECT DISTINCT st.product_id FROM stock_transactions st " +
            "  WHERE st.transaction_type = 'SALE' AND st.transaction_date >= :since" +
            ") ORDER BY p.current_stock ASC", nativeQuery = true)
    List<Product> findSlowMoversScoped(@Param("since") java.time.LocalDateTime since,
            @Param("categoryIds") List<Long> categoryIds);
}
