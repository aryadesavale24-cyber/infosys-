package com.inventra.inventory.dto;

import com.inventra.inventory.model.TransactionType;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StockTransactionDTO {

    private Long id;

    @NotNull(message = "Product ID is required")
    private Long productId;

    private String productName;
    private String productSku;

    @NotNull(message = "Transaction type is required")
    private TransactionType transactionType;

    @NotNull(message = "Quantity is required")
    @Min(value = 0, message = "Quantity must be 0 or greater")
    private Integer quantity; // Absolute value, sign determined by transaction type

    private Integer stockBefore;
    private Integer stockAfter;

    private String referenceNumber;
    private Long supplierId;
    private Long customerId;
    private Long warehouseId;

    @DecimalMin(value = "0.0", message = "Unit price must be positive")
    private BigDecimal unitPrice;

    private BigDecimal totalAmount;

    @Size(max = 1000, message = "Notes must not exceed 1000 characters")
    private String notes;

    @Size(max = 255, message = "Reason must not exceed 255 characters")
    private String reason;

    private LocalDateTime transactionDate;
    private Long performedById;
    private String performedByUsername;
    private String performedByFullName;
    private String approvedByUsername;
    private String categoryName;
}
