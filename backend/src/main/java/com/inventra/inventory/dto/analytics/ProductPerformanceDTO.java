package com.inventra.inventory.dto.analytics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductPerformanceDTO {
    private Long productId;
    private String productName;
    private String productSku;
    private String categoryName;
    private Integer unitsSold;
    private BigDecimal revenue;
    private BigDecimal costPrice;
    private BigDecimal sellingPrice;
    private BigDecimal profitMargin; // Percentage
    private Integer currentStock;
    private Integer reorderLevel;
    private Boolean isLowStock;
    private Boolean isOutOfStock;
}
