package com.inventra.inventory.service;

import com.inventra.inventory.dto.analytics.*;
import com.inventra.inventory.model.*;
import com.inventra.inventory.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AnalyticsService {

    private final StockTransactionRepository txRepo;
    private final ProductRepository productRepo;
    private final ReturnRequestRepository returnRepo;
    private final StockAlertRepository alertRepo;
    private final UserRepository userRepo;
    private final ManagerCategoryAssignmentRepository managerCatRepo;

    // ── Public API ─────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public AnalyticsSummaryDTO getSummary(LocalDateTime from, LocalDateTime to, String period) {
        User me = getCurrentUser();
        boolean isAdmin = me.getRole() == Role.ADMIN;
        List<Long> catIds = isAdmin ? null : managerCatRepo.findCategoryIdsByManagerId(me.getId());

        // Compute "previous period" window for growth %
        long rangeDays = java.time.temporal.ChronoUnit.DAYS.between(from.toLocalDate(), to.toLocalDate()) + 1;
        LocalDateTime prevFrom = from.minusDays(rangeDays);
        LocalDateTime prevTo = from.minusNanos(1);

        // — KPIs —
        BigDecimal revenue = safeRevenue(txRepo.getTotalRevenue(from, to));
        BigDecimal prevRevenue = safeRevenue(txRepo.getTotalRevenue(prevFrom, prevTo));
        BigDecimal purchaseCost = safeRevenue(txRepo.getTotalPurchaseCost(from, to));
        Integer unitsSold = txRepo.getTotalUnitsSold(from, to);
        Integer unitsPurchased = txRepo.getTotalUnitsPurchased(from, to);
        Integer damagedUnits = txRepo.getTotalDamagedUnits(from, to);
        if (unitsSold == null)
            unitsSold = 0;
        if (unitsPurchased == null)
            unitsPurchased = 0;
        if (damagedUnits == null)
            damagedUnits = 0;

        long totalTx = txRepo.getTransactionCountByType(from, to).stream()
                .mapToLong(r -> ((Number) r[1]).longValue()).sum();

        BigDecimal avgOrderValue = (unitsSold > 0)
                ? revenue.divide(BigDecimal.valueOf(unitsSold), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        BigDecimal grossProfit = revenue
                .subtract(purchaseCost.compareTo(BigDecimal.ZERO) == 0 ? BigDecimal.ZERO : purchaseCost);
        double grossMarginPct = revenue.compareTo(BigDecimal.ZERO) == 0 ? 0.0
                : grossProfit.divide(revenue, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).doubleValue();
        double growthPct = prevRevenue.compareTo(BigDecimal.ZERO) == 0 ? 0.0
                : revenue.subtract(prevRevenue).divide(prevRevenue, 4, RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(100)).doubleValue();

        // Return rate
        long totalSales = txRepo.countByTransactionType(TransactionType.SALE);
        long totalReturns = returnRepo.count();
        double returnRate = totalSales == 0 ? 0.0 : (double) totalReturns / totalSales * 100;

        // Inventory value & stock counts
        BigDecimal inventoryValue;
        long lowStockCount;
        long outOfStockCount;
        long totalProducts;
        if (isAdmin) {
            inventoryValue = safeRevenue(productRepo.getTotalInventoryValue());
            lowStockCount = productRepo.findLowStockProducts().size();
            outOfStockCount = productRepo.findOutOfStockProducts().size();
            totalProducts = productRepo.countByStatusAndIsDeleted(ProductStatus.ACTIVE, false);
        } else {
            if (catIds == null || catIds.isEmpty()) {
                inventoryValue = BigDecimal.ZERO;
                lowStockCount = 0;
                outOfStockCount = 0;
                totalProducts = 0;
            } else {
                inventoryValue = safeRevenue(productRepo.getTotalInventoryValueByCategories(catIds));
                lowStockCount = productRepo.countLowStockByCategories(catIds);
                outOfStockCount = productRepo.countOutOfStockByCategories(catIds);
                totalProducts = productRepo.findByCategoryIds(catIds).size();
            }
        }

        long activeAlerts = alertRepo.countByAlertStatus(AlertStatus.PENDING);

        // — Transaction type counts map —
        Map<String, Long> typeCounts = new LinkedHashMap<>();
        for (Object[] row : txRepo.getTransactionCountByType(from, to)) {
            typeCounts.put(row[0].toString(), ((Number) row[1]).longValue());
        }

        // — Time series —
        List<RevenueDataPointDTO> timeSeries = buildTimeSeries(from, to, period, catIds, isAdmin);

        // — Category breakdown —
        List<CategoryPerformanceDTO> catBreakdown = buildCategoryBreakdown(from, to, catIds, isAdmin, revenue);

        // — Product performance —
        List<ProductPerformanceDTO> topProducts = buildTopProducts(from, to, 10, catIds, isAdmin);
        List<ProductPerformanceDTO> bottomProducts = buildBottomProducts(from, catIds, isAdmin);
        List<ProductPerformanceDTO> atRiskProducts = buildAtRiskProducts(catIds, isAdmin);

        // — Employee performance —
        List<EmployeePerformanceDTO> empPerf = buildEmployeePerformance(from, to);

        // — Recommendations —
        List<RecommendationDTO> recommendations = computeRecommendations(catIds, isAdmin, from, to);

        return AnalyticsSummaryDTO.builder()
                .totalRevenue(revenue)
                .previousPeriodRevenue(prevRevenue)
                .revenueGrowthPct(round2(growthPct))
                .totalTransactions((int) totalTx)
                .totalUnitsSold(unitsSold)
                .totalUnitsPurchased(unitsPurchased)
                .totalInventoryValue(inventoryValue)
                .totalProducts((int) totalProducts)
                .lowStockCount((int) lowStockCount)
                .outOfStockCount((int) outOfStockCount)
                .activeAlertCount((int) activeAlerts)
                .averageOrderValue(avgOrderValue)
                .returnRate(round2(returnRate))
                .grossProfit(grossProfit)
                .grossProfitMarginPct(round2(grossMarginPct))
                .totalDamagedUnits(damagedUnits)
                .transactionTypeCounts(typeCounts)
                .revenueTimeSeries(timeSeries)
                .categoryBreakdown(catBreakdown)
                .topSellingProducts(topProducts)
                .bottomSellingProducts(bottomProducts)
                .atRiskProducts(atRiskProducts)
                .employeePerformance(empPerf)
                .recommendations(recommendations)
                .build();
    }

    // ── Private builders ───────────────────────────────────────────────────────

    private List<RevenueDataPointDTO> buildTimeSeries(LocalDateTime from, LocalDateTime to,
            String period, List<Long> catIds, boolean isAdmin) {
        List<Object[]> rows;
        if ("WEEKLY".equalsIgnoreCase(period)) {
            rows = txRepo.getWeeklyRevenueSeries(from, to);
        } else if ("MONTHLY".equalsIgnoreCase(period)) {
            rows = txRepo.getMonthlyRevenueSeries(from, to);
        } else {
            rows = txRepo.getDailyRevenueSeries(from, to);
        }
        return rows.stream().map(r -> RevenueDataPointDTO.builder()
                .label(r[0] == null ? "" : r[0].toString())
                .revenue(toBigDecimal(r[1]))
                .purchases(toBigDecimal(r[2]))
                .salesCount(toInt(r[3]))
                .purchasesCount(toInt(r[4]))
                .unitsSold(toInt(r[5]))
                .unitsPurchased(toInt(r[6]))
                .build())
                .collect(Collectors.toList());
    }

    private List<CategoryPerformanceDTO> buildCategoryBreakdown(LocalDateTime from, LocalDateTime to,
            List<Long> catIds, boolean isAdmin, BigDecimal totalRevenue) {
        List<Object[]> rows = isAdmin
                ? txRepo.getCategoryRevenueSeries(from, to)
                : (catIds != null && !catIds.isEmpty()
                        ? txRepo.getCategoryRevenueSeriesScoped(from, to, catIds)
                        : List.of());

        return rows.stream().map(r -> {
            BigDecimal rev = toBigDecimal(r[1]);
            double share = totalRevenue.compareTo(BigDecimal.ZERO) == 0 ? 0.0
                    : rev.divide(totalRevenue, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100))
                            .doubleValue();
            return CategoryPerformanceDTO.builder()
                    .categoryName(r[0] == null ? "Uncategorized" : r[0].toString())
                    .revenue(rev)
                    .unitsSold(toInt(r[2]))
                    .transactionCount(toInt(r[3]))
                    .revenueShare(BigDecimal.valueOf(round2(share)))
                    .productCount(0)
                    .lowStockCount(0)
                    .outOfStockCount(0)
                    .build();
        }).collect(Collectors.toList());
    }

    private List<ProductPerformanceDTO> buildTopProducts(LocalDateTime from, LocalDateTime to,
            int limit, List<Long> catIds, boolean isAdmin) {
        List<Object[]> rows = isAdmin
                ? txRepo.getTopProductsBySales(from, to, limit)
                : (catIds != null && !catIds.isEmpty()
                        ? txRepo.getTopProductsBySalesScoped(from, to, limit, catIds)
                        : List.of());

        return rows.stream().map(r -> {
            Long pid = toLong(r[0]);
            Optional<Product> pOpt = pid != null ? productRepo.findById(pid) : Optional.empty();
            BigDecimal cost = pOpt.map(Product::getCostPrice).orElse(BigDecimal.ZERO);
            BigDecimal sell = pOpt.map(Product::getSellingPrice).orElse(BigDecimal.ZERO);
            return ProductPerformanceDTO.builder()
                    .productId(pid)
                    .productName(r[1] == null ? "" : r[1].toString())
                    .productSku(r[2] == null ? "" : r[2].toString())
                    .categoryName(r[3] == null ? "" : r[3].toString())
                    .unitsSold(toInt(r[4]))
                    .revenue(toBigDecimal(r[5]))
                    .costPrice(cost)
                    .sellingPrice(sell)
                    .profitMargin(calcMargin(cost, sell))
                    .currentStock(pOpt.map(Product::getCurrentStock).orElse(0))
                    .reorderLevel(pOpt.map(Product::getReorderLevel).orElse(0))
                    .isLowStock(pOpt.map(Product::isLowStock).orElse(false))
                    .isOutOfStock(pOpt.map(Product::isOutOfStock).orElse(false))
                    .build();
        }).collect(Collectors.toList());
    }

    private List<ProductPerformanceDTO> buildBottomProducts(LocalDateTime from,
            List<Long> catIds, boolean isAdmin) {
        LocalDateTime since = from;
        List<Product> slowMovers = isAdmin
                ? productRepo.findSlowMovers(since)
                : (catIds != null && !catIds.isEmpty()
                        ? productRepo.findSlowMoversScoped(since, catIds)
                        : List.of());

        return slowMovers.stream().limit(5).map(p -> ProductPerformanceDTO.builder()
                .productId(p.getId())
                .productName(p.getName())
                .productSku(p.getSku())
                .categoryName(p.getCategory() != null ? p.getCategory().getName() : "")
                .unitsSold(0)
                .revenue(BigDecimal.ZERO)
                .costPrice(p.getCostPrice())
                .sellingPrice(p.getSellingPrice())
                .profitMargin(calcMargin(p.getCostPrice(), p.getSellingPrice()))
                .currentStock(p.getCurrentStock())
                .reorderLevel(p.getReorderLevel())
                .isLowStock(p.isLowStock())
                .isOutOfStock(p.isOutOfStock())
                .build()).collect(Collectors.toList());
    }

    private List<ProductPerformanceDTO> buildAtRiskProducts(List<Long> catIds, boolean isAdmin) {
        List<Product> lowStock = isAdmin
                ? productRepo.findLowStockProducts()
                : (catIds != null && !catIds.isEmpty() ? productRepo.findByCategoryIds(catIds).stream()
                        .filter(Product::isLowStock).collect(Collectors.toList()) : List.of());

        List<Product> overStock = productRepo.findOverstockProducts();
        Set<Product> combined = new LinkedHashSet<>();
        combined.addAll(lowStock);
        combined.addAll(overStock);

        return combined.stream().limit(15).map(p -> ProductPerformanceDTO.builder()
                .productId(p.getId())
                .productName(p.getName())
                .productSku(p.getSku())
                .categoryName(p.getCategory() != null ? p.getCategory().getName() : "")
                .unitsSold(0)
                .revenue(BigDecimal.ZERO)
                .costPrice(p.getCostPrice())
                .sellingPrice(p.getSellingPrice())
                .profitMargin(calcMargin(p.getCostPrice(), p.getSellingPrice()))
                .currentStock(p.getCurrentStock())
                .reorderLevel(p.getReorderLevel())
                .isLowStock(p.isLowStock())
                .isOutOfStock(p.isOutOfStock())
                .build()).collect(Collectors.toList());
    }

    private List<EmployeePerformanceDTO> buildEmployeePerformance(LocalDateTime from, LocalDateTime to) {
        List<Object[]> rows = txRepo.getEmployeePerformance(from, to);
        return rows.stream().map(r -> EmployeePerformanceDTO.builder()
                .userId(toLong(r[0]))
                .username(r[1] == null ? "" : r[1].toString())
                .fullName(r[2] == null ? "" : r[2].toString())
                .role(r[3] == null ? "" : r[3].toString())
                .transactionCount(toInt(r[4]))
                .unitsSold(toInt(r[5]))
                .totalSaleValue(toBigDecimal(r[6]))
                .returnRequestsRaised(0)
                .build()).collect(Collectors.toList());
    }

    // ── Recommendation Engine ──────────────────────────────────────────────────

    private List<RecommendationDTO> computeRecommendations(List<Long> catIds, boolean isAdmin,
            LocalDateTime from, LocalDateTime to) {
        List<RecommendationDTO> recs = new ArrayList<>();

        List<Product> products = isAdmin
                ? productRepo.findLowStockProducts()
                : (catIds != null && !catIds.isEmpty()
                        ? productRepo.findByCategoryIds(catIds).stream()
                                .filter(Product::isLowStock).collect(Collectors.toList())
                        : List.of());

        // Rule 1: Critical reorder needed
        for (Product p : products) {
            if (p.getCurrentStock() == 0) {
                BigDecimal impact = p.getSellingPrice().multiply(BigDecimal.valueOf(p.getReorderLevel()));
                recs.add(RecommendationDTO.builder()
                        .id("reorder-oos-" + p.getId())
                        .priority(RecommendationDTO.Priority.CRITICAL)
                        .category(RecommendationDTO.Category.REORDER)
                        .title("Out of Stock: " + p.getName())
                        .description(
                                "Product is completely out of stock. Immediate restock required to prevent lost sales.")
                        .actionLabel("Reorder Now")
                        .affectedEntity(p.getName())
                        .potentialImpact(impact)
                        .metric("Stock: 0 / Min: " + p.getReorderLevel())
                        .build());
            } else if (p.getCurrentStock() <= p.getReorderLevel()) {
                BigDecimal impact = p.getCostPrice().multiply(BigDecimal.valueOf(p.getReorderLevel()));
                recs.add(RecommendationDTO.builder()
                        .id("reorder-low-" + p.getId())
                        .priority(RecommendationDTO.Priority.HIGH)
                        .category(RecommendationDTO.Category.REORDER)
                        .title("Reorder Required: " + p.getName())
                        .description("Stock at " + p.getCurrentStock() + " units — below reorder level of "
                                + p.getReorderLevel() + ". Place order soon.")
                        .actionLabel("Reorder Now")
                        .affectedEntity(p.getName())
                        .potentialImpact(impact)
                        .metric("Stock: " + p.getCurrentStock() + " / Min: " + p.getReorderLevel())
                        .build());
            }
        }

        // Rule 2: Overstock
        for (Product p : productRepo.findOverstockProducts()) {
            int excess = p.getCurrentStock() - p.getMaxStockLevel();
            BigDecimal holdingCost = p.getCostPrice().multiply(BigDecimal.valueOf(excess));
            recs.add(RecommendationDTO.builder()
                    .id("overstock-" + p.getId())
                    .priority(RecommendationDTO.Priority.MEDIUM)
                    .category(RecommendationDTO.Category.OVERSTOCK)
                    .title("Overstock Detected: " + p.getName())
                    .description("Holding " + excess + " excess units above max level. ₹" +
                            holdingCost.setScale(0, RoundingMode.HALF_UP) + " capital tied up unnecessarily.")
                    .actionLabel("Review Stock")
                    .affectedEntity(p.getName())
                    .potentialImpact(holdingCost)
                    .metric("Stock: " + p.getCurrentStock() + " / Max: " + p.getMaxStockLevel())
                    .build());
        }

        // Rule 3: Low profit margin (<15%)
        List<Product> allActive = isAdmin
                ? productRepo.findAll().stream()
                        .filter(p -> !p.getIsDeleted() && p.getStatus() == ProductStatus.ACTIVE)
                        .collect(Collectors.toList())
                : (catIds != null && !catIds.isEmpty() ? productRepo.findByCategoryIds(catIds) : List.of());

        for (Product p : allActive) {
            BigDecimal margin = calcMargin(p.getCostPrice(), p.getSellingPrice());
            if (margin.compareTo(BigDecimal.valueOf(15)) < 0 && p.getSellingPrice().compareTo(BigDecimal.ZERO) > 0) {
                recs.add(RecommendationDTO.builder()
                        .id("margin-" + p.getId())
                        .priority(RecommendationDTO.Priority.LOW)
                        .category(RecommendationDTO.Category.PRICING)
                        .title("Low Margin: " + p.getName())
                        .description("Current profit margin is " + margin.setScale(1, RoundingMode.HALF_UP) +
                                "%. Consider revising price or sourcing costs.")
                        .actionLabel("Review Pricing")
                        .affectedEntity(p.getName())
                        .potentialImpact(p.getCostPrice().multiply(BigDecimal.valueOf(0.05)))
                        .metric("Margin: " + margin.setScale(1, RoundingMode.HALF_UP) + "%")
                        .build());
            }
        }

        // Rule 4: Slow movers (no sales in selection period)
        LocalDateTime slowMoverSince = from;
        List<Product> slowMovers = isAdmin
                ? productRepo.findSlowMovers(slowMoverSince)
                : (catIds != null && !catIds.isEmpty()
                        ? productRepo.findSlowMoversScoped(slowMoverSince, catIds)
                        : List.of());
        for (Product p : slowMovers.stream().limit(3).collect(Collectors.toList())) {
            BigDecimal holdingCost = p.getCostPrice().multiply(BigDecimal.valueOf(p.getCurrentStock()));
            recs.add(RecommendationDTO.builder()
                    .id("slow-" + p.getId())
                    .priority(RecommendationDTO.Priority.MEDIUM)
                    .category(RecommendationDTO.Category.SLOW_MOVER)
                    .title("Slow Mover: " + p.getName())
                    .description("No sales recorded during the selected period. ₹" +
                            holdingCost.setScale(0, RoundingMode.HALF_UP) + " in idle inventory.")
                    .actionLabel("Create Promotion")
                    .affectedEntity(p.getName())
                    .potentialImpact(holdingCost)
                    .metric("Current Stock: " + p.getCurrentStock() + " units")
                    .build());
        }

        // Sort: CRITICAL → HIGH → MEDIUM → LOW, then by impact desc
        recs.sort(Comparator
                .comparingInt((RecommendationDTO r) -> r.getPriority().ordinal())
                .thenComparing(Comparator.comparing(
                        r -> r.getPotentialImpact() == null ? BigDecimal.ZERO : r.getPotentialImpact(),
                        Comparator.reverseOrder())));

        return recs.stream().limit(12).collect(Collectors.toList());
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private BigDecimal safeRevenue(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }

    private BigDecimal toBigDecimal(Object o) {
        if (o == null)
            return BigDecimal.ZERO;
        if (o instanceof BigDecimal bd)
            return bd;
        return new BigDecimal(o.toString());
    }

    private Integer toInt(Object o) {
        if (o == null)
            return 0;
        return ((Number) o).intValue();
    }

    private Long toLong(Object o) {
        if (o == null)
            return null;
        return ((Number) o).longValue();
    }

    private BigDecimal calcMargin(BigDecimal cost, BigDecimal sell) {
        if (sell == null || sell.compareTo(BigDecimal.ZERO) == 0)
            return BigDecimal.ZERO;
        return sell.subtract(cost).divide(sell, 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100)).setScale(2, RoundingMode.HALF_UP);
    }

    private double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepo.findByUsername(username)
                .orElseThrow(() -> new com.inventra.inventory.exception.ResourceNotFoundException(
                        "User not found: " + username));
    }
}
