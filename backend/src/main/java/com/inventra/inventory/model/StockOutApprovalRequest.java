package com.inventra.inventory.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "stock_out_approval_requests", indexes = {
        @Index(name = "idx_approval_staff", columnList = "staff_id"),
        @Index(name = "idx_approval_manager", columnList = "manager_id"),
        @Index(name = "idx_approval_status", columnList = "status"),
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class StockOutApprovalRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // — Product being sold ——————————————————————————
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(nullable = false)
    private Integer quantity;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "reference_number", length = 100)
    private String referenceNumber;

    // — Parties ——————————————————————————————————————
    /** Staff who raised the request */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "staff_id", nullable = false)
    private User staff;

    /** Manager chosen by the staff to approve */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manager_id", nullable = false)
    private User manager;

    // — Status / Resolution ——————————————————————————
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ApprovalStatus status = ApprovalStatus.PENDING;

    @Column(name = "manager_note", columnDefinition = "TEXT")
    private String managerNote;

    // — Timestamps ——————————————————————————————————
    @Column(name = "requested_at", nullable = false, updatable = false)
    private LocalDateTime requestedAt;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @PrePersist
    protected void onCreate() {
        requestedAt = LocalDateTime.now();
    }
}
