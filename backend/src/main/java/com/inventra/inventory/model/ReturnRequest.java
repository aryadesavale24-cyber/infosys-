package com.inventra.inventory.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Represents a customer return request raised by Staff.
 * Mirrors the StockOutApprovalRequest pattern — every return must
 * be reviewed and resolved by a Manager before stock is touched.
 *
 * Lifecycle:
 * PENDING → APPROVED_RESTOCK (good item → stockIn RETURN transaction)
 * PENDING → APPROVED_DAMAGE (defective → DAMAGE audit record, no restock)
 * PENDING → REJECTED (return not accepted → no stock change)
 */
@Entity
@Table(name = "return_requests", indexes = {
        @Index(name = "idx_return_staff", columnList = "staff_id"),
        @Index(name = "idx_return_manager", columnList = "manager_id"),
        @Index(name = "idx_return_status", columnList = "status"),
        @Index(name = "idx_return_product", columnList = "product_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReturnRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ── Product being returned ────────────────────────────────────────────────
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(nullable = false)
    private Integer quantity;

    // ── Return context ────────────────────────────────────────────────────────
    @Enumerated(EnumType.STRING)
    @Column(name = "return_reason", nullable = false, length = 50)
    private ReturnReason returnReason;

    /**
     * Condition observed by Staff when receiving the item from the customer.
     * Manager may override this assessment during their inspection.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "item_condition", nullable = false, length = 20)
    private ItemCondition itemCondition;

    /**
     * Links this return back to its original sale transaction.
     * Matches stock_transactions.reference_number for full traceability.
     */
    @Column(name = "original_sale_ref", length = 100)
    private String originalSaleRef;

    @Column(name = "customer_name", length = 255)
    private String customerName;

    // ── Notes ─────────────────────────────────────────────────────────────────
    @Column(name = "staff_notes", columnDefinition = "TEXT")
    private String staffNotes;

    @Column(name = "manager_notes", columnDefinition = "TEXT")
    private String managerNotes;

    // ── Parties ───────────────────────────────────────────────────────────────
    /** Staff member who physically received the return from the customer */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "staff_id", nullable = false)
    private User staff;

    /** Manager selected by Staff to inspect and approve/reject */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manager_id", nullable = false)
    private User manager;

    // ── Status ────────────────────────────────────────────────────────────────
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 25)
    private ReturnStatus status = ReturnStatus.PENDING;

    /**
     * The stock transaction that was created as a result of this return.
     * Populated only after APPROVED_RESTOCK or APPROVED_DAMAGE resolution.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stock_transaction_id")
    private StockTransaction stockTransaction;

    // ── Timestamps ─────────────────────────────────────────────────────────────
    @Column(name = "requested_at", nullable = false, updatable = false)
    private LocalDateTime requestedAt;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @PrePersist
    protected void onCreate() {
        requestedAt = LocalDateTime.now();
    }
}
