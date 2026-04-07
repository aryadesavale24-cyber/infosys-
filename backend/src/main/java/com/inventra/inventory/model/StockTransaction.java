package com.inventra.inventory.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "stock_transactions", indexes = {
        @Index(name = "idx_stock_product", columnList = "product_id"),
        @Index(name = "idx_stock_type", columnList = "transaction_type"),
        @Index(name = "idx_stock_date", columnList = "transaction_date")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class StockTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Product Reference
    @NotNull(message = "Product is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    // Transaction Details
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TransactionType transactionType;

    @NotNull(message = "Quantity change is required")
    @Column(nullable = false)
    private Integer quantityChange; // Positive for IN, Negative for OUT

    // Before/After Snapshot (for audit and reconciliation)
    @NotNull(message = "Stock before is required")
    @Column(nullable = false)
    private Integer stockBefore;

    @NotNull(message = "Stock after is required")
    @Column(nullable = false)
    private Integer stockAfter;

    // Transaction Context
    @Column(length = 100)
    private String referenceNumber; // PO number, Invoice number, etc.

    @Column(name = "supplier_id")
    private Long supplierId; // For PURCHASE transactions

    @Column(name = "customer_id")
    private Long customerId; // For SALE transactions

    @Column(name = "warehouse_id")
    private Long warehouseId; // Multi-warehouse support

    // Pricing at transaction time
    @Column(precision = 10, scale = 2)
    private BigDecimal unitPrice;

    @Column(precision = 10, scale = 2)
    private BigDecimal totalAmount;

    // Notes & Reason
    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(length = 255)
    private String reason; // For adjustments/damage

    // Audit
    @Column(name = "transaction_date", nullable = false)
    private LocalDateTime transactionDate;

    @NotNull(message = "Performed by user is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "performed_by", nullable = false)
    private User performedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by")
    private User approvedBy; // For approval workflow

    @PrePersist
    protected void onCreate() {
        if (transactionDate == null) {
            transactionDate = LocalDateTime.now();
        }
        // Calculate total amount if not provided
        if (totalAmount == null && unitPrice != null) {
            totalAmount = unitPrice.multiply(new BigDecimal(Math.abs(quantityChange)));
        }
    }

    // Business Methods
    public boolean isStockIn() {
        return quantityChange > 0;
    }

    public boolean isStockOut() {
        return quantityChange < 0;
    }
}
