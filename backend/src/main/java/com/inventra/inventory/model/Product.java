package com.inventra.inventory.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "products", indexes = {
        @Index(name = "idx_product_sku", columnList = "sku"),
        @Index(name = "idx_product_barcode", columnList = "barcode"),
        @Index(name = "idx_product_category", columnList = "category_id"),
        @Index(name = "idx_product_status", columnList = "status")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Unique Identifiers
    @NotBlank(message = "SKU is required")
    @Size(max = 50, message = "SKU must not exceed 50 characters")
    @Column(unique = true, nullable = false, length = 50)
    private String sku;

    @Size(max = 50, message = "Barcode must not exceed 50 characters")
    @Column(unique = true, length = 50)
    private String barcode;

    // Basic Information
    @NotBlank(message = "Product name is required")
    @Size(max = 255, message = "Product name must not exceed 255 characters")
    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sub_category_id")
    private Category subCategory;

    // Supplier Management
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supplier_id")
    private Supplier supplier;

    // Pricing
    @NotNull(message = "Cost price is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Cost price must be greater than 0")
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal costPrice;

    @NotNull(message = "Selling price is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Selling price must be greater than 0")
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal sellingPrice;

    @Size(max = 3)
    @Column(length = 3)
    private String currency = "INR";

    // Stock Management
    @Column(nullable = false)
    private Integer currentStock = 0;

    @NotNull(message = "Reorder level is required")
    @Min(value = 0, message = "Reorder level must be at least 0")
    @Column(nullable = false)
    private Integer reorderLevel;

    @Min(value = 0, message = "Max stock level must be at least 0")
    private Integer maxStockLevel;

    // Product Status
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ProductStatus status = ProductStatus.ACTIVE;

    // Product Details
    @Size(max = 255)
    private String manufacturer;

    @Size(max = 100)
    private String brand;

    @Size(max = 20)
    private String unitOfMeasure; // PCS, KG, LITER, etc.

    @DecimalMin(value = "0.0", message = "Weight must be positive")
    @Column(precision = 10, scale = 2)
    private BigDecimal weight;

    @Size(max = 50)
    private String dimensions; // e.g., "10x20x30 cm"

    // Image & Media
    @Size(max = 500)
    private String imageUrl;

    // Audit Fields
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by")
    private User updatedBy;

    // Soft Delete
    @Column(nullable = false)
    private Boolean isDeleted = false;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deleted_by")
    private User deletedBy;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (currentStock == null) {
            currentStock = 0;
        }
        if (status == null) {
            status = ProductStatus.ACTIVE;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Business Methods
    public boolean isLowStock() {
        return currentStock <= reorderLevel;
    }

    public boolean isOutOfStock() {
        return currentStock == 0;
    }

    public boolean isOverStock() {
        return maxStockLevel != null && currentStock > maxStockLevel;
    }

    public BigDecimal getProfitMargin() {
        if (costPrice.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        return sellingPrice.subtract(costPrice)
                .divide(costPrice, 4, java.math.RoundingMode.HALF_UP)
                .multiply(new BigDecimal("100"));
    }

    public BigDecimal getStockValue() {
        return costPrice.multiply(new BigDecimal(currentStock));
    }
}
