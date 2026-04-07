package com.inventra.inventory.dto.analytics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnalyticsSummaryDTO {

    // ── KPI Cards ─────────────────────────────────────────────────────────────
    private BigDecimal totalRevenue;
    private BigDecimal previousPeriodRevenue;
    private Double revenueGrowthPct; // % change vs previous period
    private Integer totalTransactions;
    private Integer totalUnitsSold;
    private Integer totalUnitsPurchased;
    private BigDecimal totalInventoryValue; // sum(costPrice * currentStock)
    private Integer totalProducts;
    private Integer lowStockCount;
    private Integer outOfStockCount;
    private Integer activeAlertCount;
    private BigDecimal averageOrderValue;
    private Double returnRate; // returns / sales %
    private BigDecimal grossProfit;
    private Double grossProfitMarginPct;
    private Integer totalDamagedUnits;

    // ── Transaction type breakdown (for pie chart) ────────────────────────────
    private Map<String, Long> transactionTypeCounts; // { "SALE": 120, "PURCHASE": 45 ... }

    // ── Time-series chart data ────────────────────────────────────────────────
    private List<RevenueDataPointDTO> revenueTimeSeries;

    // ── Category breakdown ────────────────────────────────────────────────────
    private List<CategoryPerformanceDTO> categoryBreakdown;

    // ── Product performance ────────────────────────────────────────────────────
    private List<ProductPerformanceDTO> topSellingProducts; // Top 10 by qty sold
    private List<ProductPerformanceDTO> bottomSellingProducts; // Bottom 5 (slow movers)
    private List<ProductPerformanceDTO> atRiskProducts; // Low stock or overstock

    // ── Employee performance ───────────────────────────────────────────────────
    private List<EmployeePerformanceDTO> employeePerformance;

    // ── Intelligent recommendations ────────────────────────────────────────────
    private List<RecommendationDTO> recommendations;
}
