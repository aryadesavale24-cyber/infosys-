package com.inventra.inventory.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "stock_alerts")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class StockAlert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Product is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AlertType alertType;

    @Column(nullable = false)
    private Integer currentStock;

    @Column(nullable = false)
    private Integer thresholdValue;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private AlertStatus alertStatus = AlertStatus.PENDING;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "acknowledged_by")
    private User acknowledgedBy;

    @Column(name = "acknowledged_at")
    private LocalDateTime acknowledgedAt;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    // Business Methods
    public void acknowledge(User user) {
        this.acknowledgedBy = user;
        this.acknowledgedAt = LocalDateTime.now();
        this.alertStatus = AlertStatus.ACKNOWLEDGED;
    }

    public void resolve() {
        this.alertStatus = AlertStatus.RESOLVED;
        this.resolvedAt = LocalDateTime.now();
    }
}
