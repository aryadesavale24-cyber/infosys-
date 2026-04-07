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
public class RevenueDataPointDTO {
    private String label; // e.g. "Mar 15", "Week 11", "March"
    private BigDecimal revenue; // Total sale amount
    private BigDecimal purchases; // Total purchase amount
    private Integer salesCount; // Number of sale transactions
    private Integer purchasesCount;// Number of purchase transactions
    private Integer unitsSold; // Total units sold
    private Integer unitsPurchased;// Total units purchased
}
