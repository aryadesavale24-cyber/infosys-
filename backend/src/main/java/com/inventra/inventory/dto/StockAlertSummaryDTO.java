package com.inventra.inventory.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StockAlertSummaryDTO {

    // By status
    private long pendingCount;
    private long acknowledgedCount;
    private long resolvedCount;

    // By type
    private long lowStockCount;
    private long outOfStockCount;
    private long overstockCount;
}
