package com.inventra.inventory.dto;

import com.inventra.inventory.model.ItemCondition;
import com.inventra.inventory.model.ReturnReason;
import com.inventra.inventory.model.ReturnStatus;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Data Transfer Object for ReturnRequest.
 * Used for both incoming requests (staff raises return) and outgoing responses.
 * Admin view adds supplier info + financial impact fields.
 */
@Data
public class ReturnRequestDTO {

    // ── Identifiers ────────────────────────────────────────────────────────────
    private Long id;

    // ── Product info ───────────────────────────────────────────────────────────
    private Long productId;
    private String productName;
    private String productSku;
    private String categoryName;

    // ── Supplier info (admin history view) ────────────────────────────────────
    private Long supplierId;
    private String supplierName;
    private String supplierEmail;

    // ── Product pricing (for financial impact) ─────────────────────────────────
    private BigDecimal productCostPrice;
    private BigDecimal productSellingPrice;

    /**
     * Estimated financial impact:
     * APPROVED_RESTOCK → 0 (item back on shelf, no loss)
     * APPROVED_DAMAGE → quantity × costPrice (written off)
     * REJECTED / PENDING → 0 / null
     */
    private BigDecimal estimatedLoss;

    // ── Return details ─────────────────────────────────────────────────────────
    private Integer quantity;
    private ReturnReason returnReason;
    private ItemCondition itemCondition;
    private String originalSaleRef;
    private String customerName;

    // ── Notes ──────────────────────────────────────────────────────────────────
    private String staffNotes;
    private String managerNotes;

    // ── Staff ──────────────────────────────────────────────────────────────────
    private Long staffId;
    private String staffUsername;
    private String staffFullName;

    // ── Manager ────────────────────────────────────────────────────────────────
    private Long managerId;
    private String managerUsername;
    private String managerFullName;

    // ── Status ────────────────────────────────────────────────────────────────
    private ReturnStatus status;

    // ── Resulting transaction ──────────────────────────────────────────────────
    private Long stockTransactionId;

    // ── Timestamps ────────────────────────────────────────────────────────────
    private LocalDateTime requestedAt;
    private LocalDateTime resolvedAt;
}
