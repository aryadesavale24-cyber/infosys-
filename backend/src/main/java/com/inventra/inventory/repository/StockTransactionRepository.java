package com.inventra.inventory.repository;

import com.inventra.inventory.model.StockTransaction;
import com.inventra.inventory.model.TransactionType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface StockTransactionRepository extends JpaRepository<StockTransaction, Long> {

        // Find by product
        Page<StockTransaction> findByProductId(Long productId, Pageable pageable);

        List<StockTransaction> findByProductIdOrderByTransactionDateDesc(Long productId);

        // Find by transaction type
        Page<StockTransaction> findByTransactionType(TransactionType transactionType, Pageable pageable);

        // Find by date range
        @Query("SELECT st FROM StockTransaction st WHERE st.transactionDate BETWEEN :startDate AND :endDate")
        List<StockTransaction> findByDateRange(@Param("startDate") LocalDateTime startDate,
                        @Param("endDate") LocalDateTime endDate);

        // Find by product and date range
        @Query("SELECT st FROM StockTransaction st WHERE st.product.id = :productId AND st.transactionDate BETWEEN :startDate AND :endDate")
        List<StockTransaction> findByProductAndDateRange(@Param("productId") Long productId,
                        @Param("startDate") LocalDateTime startDate,
                        @Param("endDate") LocalDateTime endDate);

        // Find by performed by user
        Page<StockTransaction> findByPerformedById(Long userId, Pageable pageable);

        // Calculate total stock for a product (for reconciliation)
        @Query("SELECT COALESCE(SUM(st.quantityChange), 0) FROM StockTransaction st WHERE st.product.id = :productId")
        Integer calculateTotalStockForProduct(@Param("productId") Long productId);

        // Get recent transactions
        @Query("SELECT st FROM StockTransaction st ORDER BY st.transactionDate DESC")
        Page<StockTransaction> findRecentTransactions(Pageable pageable);

        // Count transactions by type
        long countByTransactionType(TransactionType transactionType);

        // Find by reference number
        List<StockTransaction> findByReferenceNumber(String referenceNumber);

        // Find transactions for products in specific categories (for manager-scoped
        // reports)
        @Query("SELECT st FROM StockTransaction st WHERE st.product.category.id IN :categoryIds ORDER BY st.transactionDate DESC")
        List<StockTransaction> findByCategoryIds(@Param("categoryIds") List<Long> categoryIds);

        // ── Analytics queries ─────────────────────────────────────────────────

        // Total revenue and purchase cost in a date range
        @Query("SELECT COALESCE(SUM(st.totalAmount), 0) FROM StockTransaction st " +
                        "WHERE st.transactionType = 'SALE' AND st.transactionDate BETWEEN :start AND :end")
        BigDecimal getTotalRevenue(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

        @Query("SELECT COALESCE(SUM(st.totalAmount), 0) FROM StockTransaction st " +
                        "WHERE st.transactionType = 'PURCHASE' AND st.transactionDate BETWEEN :start AND :end")
        BigDecimal getTotalPurchaseCost(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

        // Total units sold and purchased
        @Query("SELECT COALESCE(SUM(ABS(st.quantityChange)), 0) FROM StockTransaction st " +
                        "WHERE st.transactionType = 'SALE' AND st.transactionDate BETWEEN :start AND :end")
        Integer getTotalUnitsSold(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

        @Query("SELECT COALESCE(SUM(st.quantityChange), 0) FROM StockTransaction st " +
                        "WHERE st.transactionType = 'PURCHASE' AND st.transactionDate BETWEEN :start AND :end")
        Integer getTotalUnitsPurchased(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

        @Query("SELECT COALESCE(SUM(ABS(st.quantityChange)), 0) FROM StockTransaction st " +
                        "WHERE st.transactionType = 'DAMAGE' AND st.transactionDate BETWEEN :start AND :end")
        Integer getTotalDamagedUnits(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

        // Count of transactions by type
        @Query("SELECT st.transactionType, COUNT(st) FROM StockTransaction st " +
                        "WHERE st.transactionDate BETWEEN :start AND :end GROUP BY st.transactionType")
        List<Object[]> getTransactionCountByType(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

        // Daily revenue time series: returns [date_string, sale_revenue, purchase_cost,
        // sale_count, purchase_count, units_sold, units_purchased]
        @Query(value = "SELECT DATE(transaction_date) as tx_date, " +
                        "COALESCE(SUM(CASE WHEN transaction_type='SALE' THEN total_amount ELSE 0 END), 0) as revenue, "
                        +
                        "COALESCE(SUM(CASE WHEN transaction_type='PURCHASE' THEN total_amount ELSE 0 END), 0) as purchases, "
                        +
                        "COALESCE(SUM(CASE WHEN transaction_type='SALE' THEN 1 ELSE 0 END), 0) as sale_count, " +
                        "COALESCE(SUM(CASE WHEN transaction_type='PURCHASE' THEN 1 ELSE 0 END), 0) as purchase_count, "
                        +
                        "COALESCE(SUM(CASE WHEN transaction_type='SALE' THEN ABS(quantity_change) ELSE 0 END), 0) as units_sold, "
                        +
                        "COALESCE(SUM(CASE WHEN transaction_type='PURCHASE' THEN quantity_change ELSE 0 END), 0) as units_purchased "
                        +
                        "FROM stock_transactions WHERE transaction_date BETWEEN :start AND :end " +
                        "GROUP BY DATE(transaction_date) ORDER BY tx_date ASC", nativeQuery = true)
        List<Object[]> getDailyRevenueSeries(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

        // Weekly revenue time series
        @Query(value = "SELECT YEARWEEK(transaction_date, 1) as tx_week, " +
                        "COALESCE(SUM(CASE WHEN transaction_type='SALE' THEN total_amount ELSE 0 END), 0) as revenue, "
                        +
                        "COALESCE(SUM(CASE WHEN transaction_type='PURCHASE' THEN total_amount ELSE 0 END), 0) as purchases, "
                        +
                        "COALESCE(SUM(CASE WHEN transaction_type='SALE' THEN 1 ELSE 0 END), 0) as sale_count, " +
                        "COALESCE(SUM(CASE WHEN transaction_type='PURCHASE' THEN 1 ELSE 0 END), 0) as purchase_count, "
                        +
                        "COALESCE(SUM(CASE WHEN transaction_type='SALE' THEN ABS(quantity_change) ELSE 0 END), 0) as units_sold, "
                        +
                        "COALESCE(SUM(CASE WHEN transaction_type='PURCHASE' THEN quantity_change ELSE 0 END), 0) as units_purchased "
                        +
                        "FROM stock_transactions WHERE transaction_date BETWEEN :start AND :end " +
                        "GROUP BY YEARWEEK(transaction_date, 1) ORDER BY tx_week ASC", nativeQuery = true)
        List<Object[]> getWeeklyRevenueSeries(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

        // Monthly revenue time series
        @Query(value = "SELECT DATE_FORMAT(transaction_date, '%Y-%m') as tx_month, " +
                        "COALESCE(SUM(CASE WHEN transaction_type='SALE' THEN total_amount ELSE 0 END), 0) as revenue, "
                        +
                        "COALESCE(SUM(CASE WHEN transaction_type='PURCHASE' THEN total_amount ELSE 0 END), 0) as purchases, "
                        +
                        "COALESCE(SUM(CASE WHEN transaction_type='SALE' THEN 1 ELSE 0 END), 0) as sale_count, " +
                        "COALESCE(SUM(CASE WHEN transaction_type='PURCHASE' THEN 1 ELSE 0 END), 0) as purchase_count, "
                        +
                        "COALESCE(SUM(CASE WHEN transaction_type='SALE' THEN ABS(quantity_change) ELSE 0 END), 0) as units_sold, "
                        +
                        "COALESCE(SUM(CASE WHEN transaction_type='PURCHASE' THEN quantity_change ELSE 0 END), 0) as units_purchased "
                        +
                        "FROM stock_transactions WHERE transaction_date BETWEEN :start AND :end " +
                        "GROUP BY DATE_FORMAT(transaction_date, '%Y-%m') ORDER BY tx_month ASC", nativeQuery = true)
        List<Object[]> getMonthlyRevenueSeries(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

        // Category revenue breakdown
        @Query(value = "SELECT c.name as category_name, " +
                        "COALESCE(SUM(CASE WHEN st.transaction_type='SALE' THEN st.total_amount ELSE 0 END), 0) as revenue, "
                        +
                        "COALESCE(SUM(CASE WHEN st.transaction_type='SALE' THEN ABS(st.quantity_change) ELSE 0 END), 0) as units_sold, "
                        +
                        "COUNT(st.id) as tx_count " +
                        "FROM stock_transactions st " +
                        "JOIN products p ON st.product_id = p.id " +
                        "JOIN categories c ON p.category_id = c.id " +
                        "WHERE st.transaction_date BETWEEN :start AND :end " +
                        "GROUP BY c.id, c.name ORDER BY revenue DESC", nativeQuery = true)
        List<Object[]> getCategoryRevenueSeries(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

        // Category revenue for specific categories (manager-scoped)
        @Query(value = "SELECT c.name as category_name, " +
                        "COALESCE(SUM(CASE WHEN st.transaction_type='SALE' THEN st.total_amount ELSE 0 END), 0) as revenue, "
                        +
                        "COALESCE(SUM(CASE WHEN st.transaction_type='SALE' THEN ABS(st.quantity_change) ELSE 0 END), 0) as units_sold, "
                        +
                        "COUNT(st.id) as tx_count " +
                        "FROM stock_transactions st " +
                        "JOIN products p ON st.product_id = p.id " +
                        "JOIN categories c ON p.category_id = c.id " +
                        "WHERE st.transaction_date BETWEEN :start AND :end AND c.id IN (:categoryIds) " +
                        "GROUP BY c.id, c.name ORDER BY revenue DESC", nativeQuery = true)
        List<Object[]> getCategoryRevenueSeriesScoped(
                        @Param("start") LocalDateTime start,
                        @Param("end") LocalDateTime end,
                        @Param("categoryIds") List<Long> categoryIds);

        // Top products by sales quantity
        @Query(value = "SELECT p.id, p.name, p.sku, c.name as cat_name, " +
                        "COALESCE(SUM(ABS(st.quantity_change)), 0) as units_sold, " +
                        "COALESCE(SUM(st.total_amount), 0) as total_revenue " +
                        "FROM stock_transactions st " +
                        "JOIN products p ON st.product_id = p.id " +
                        "LEFT JOIN categories c ON p.category_id = c.id " +
                        "WHERE st.transaction_type = 'SALE' AND st.transaction_date BETWEEN :start AND :end " +
                        "GROUP BY p.id, p.name, p.sku, c.name ORDER BY units_sold DESC LIMIT :limit", nativeQuery = true)
        List<Object[]> getTopProductsBySales(@Param("start") LocalDateTime start,
                        @Param("end") LocalDateTime end,
                        @Param("limit") int limit);

        // Top products scoped to category IDs
        @Query(value = "SELECT p.id, p.name, p.sku, c.name as cat_name, " +
                        "COALESCE(SUM(ABS(st.quantity_change)), 0) as units_sold, " +
                        "COALESCE(SUM(st.total_amount), 0) as total_revenue " +
                        "FROM stock_transactions st " +
                        "JOIN products p ON st.product_id = p.id " +
                        "LEFT JOIN categories c ON p.category_id = c.id " +
                        "WHERE st.transaction_type = 'SALE' AND st.transaction_date BETWEEN :start AND :end " +
                        "AND c.id IN (:categoryIds) " +
                        "GROUP BY p.id, p.name, p.sku, c.name ORDER BY units_sold DESC LIMIT :limit", nativeQuery = true)
        List<Object[]> getTopProductsBySalesScoped(@Param("start") LocalDateTime start,
                        @Param("end") LocalDateTime end,
                        @Param("limit") int limit,
                        @Param("categoryIds") List<Long> categoryIds);

        // Employee performance: transactions performed
        @Query(value = "SELECT u.id, u.username, u.full_name, u.role, " +
                        "COUNT(st.id) as tx_count, " +
                        "COALESCE(SUM(CASE WHEN st.transaction_type='SALE' THEN ABS(st.quantity_change) ELSE 0 END), 0) as units_sold, "
                        +
                        "COALESCE(SUM(CASE WHEN st.transaction_type='SALE' THEN st.total_amount ELSE 0 END), 0) as sale_value "
                        +
                        "FROM stock_transactions st " +
                        "JOIN users u ON st.performed_by = u.id " +
                        "WHERE st.transaction_date BETWEEN :start AND :end " +
                        "GROUP BY u.id, u.username, u.full_name, u.role ORDER BY units_sold DESC", nativeQuery = true)
        List<Object[]> getEmployeePerformance(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);
}
