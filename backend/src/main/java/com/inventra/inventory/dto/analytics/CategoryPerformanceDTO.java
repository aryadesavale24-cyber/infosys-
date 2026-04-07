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
public class CategoryPerformanceDTO {
    private String categoryName;
    private BigDecimal revenue;
    private Integer unitsSold;
    private Integer transactionCount;
    private Integer productCount;
    private BigDecimal revenueShare; // Percentage of total revenue
    private Integer lowStockCount;
    private Integer outOfStockCount;
}
