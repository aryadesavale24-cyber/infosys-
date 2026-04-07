// Analytics TypeScript types matching backend DTOs

export interface RevenueDataPointDTO {
    label: string;
    revenue: number;
    purchases: number;
    salesCount: number;
    purchasesCount: number;
    unitsSold: number;
    unitsPurchased: number;
}

export interface CategoryPerformanceDTO {
    categoryName: string;
    revenue: number;
    unitsSold: number;
    transactionCount: number;
    productCount: number;
    revenueShare: number;
    lowStockCount: number;
    outOfStockCount: number;
}

export interface ProductPerformanceDTO {
    productId: number;
    productName: string;
    productSku: string;
    categoryName: string;
    unitsSold: number;
    revenue: number;
    costPrice: number;
    sellingPrice: number;
    profitMargin: number;
    currentStock: number;
    reorderLevel: number;
    isLowStock: boolean;
    isOutOfStock: boolean;
}

export type RecommendationPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type RecommendationCategory = 'REORDER' | 'OVERSTOCK' | 'PRICING' | 'RETURN_ANOMALY' | 'PERFORMANCE' | 'SLOW_MOVER';

export interface RecommendationDTO {
    id: string;
    priority: RecommendationPriority;
    category: RecommendationCategory;
    title: string;
    description: string;
    actionLabel: string;
    affectedEntity: string;
    potentialImpact: number;
    metric: string;
}

export interface EmployeePerformanceDTO {
    userId: number;
    username: string;
    fullName: string;
    role: string;
    transactionCount: number;
    unitsSold: number;
    totalSaleValue: number;
    returnRequestsRaised: number;
}

export interface AnalyticsSummaryDTO {
    // KPIs
    totalRevenue: number;
    previousPeriodRevenue: number;
    revenueGrowthPct: number;
    totalTransactions: number;
    totalUnitsSold: number;
    totalUnitsPurchased: number;
    totalInventoryValue: number;
    totalProducts: number;
    lowStockCount: number;
    outOfStockCount: number;
    activeAlertCount: number;
    averageOrderValue: number;
    returnRate: number;
    grossProfit: number;
    grossProfitMarginPct: number;
    totalDamagedUnits: number;
    // Charts
    transactionTypeCounts: Record<string, number>;
    revenueTimeSeries: RevenueDataPointDTO[];
    categoryBreakdown: CategoryPerformanceDTO[];
    topSellingProducts: ProductPerformanceDTO[];
    bottomSellingProducts: ProductPerformanceDTO[];
    atRiskProducts: ProductPerformanceDTO[];
    employeePerformance: EmployeePerformanceDTO[];
    // Recommendations
    recommendations: RecommendationDTO[];
}

export type AnalyticsPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface AnalyticsFilters {
    from: string;   // YYYY-MM-DD
    to: string;     // YYYY-MM-DD
    period: AnalyticsPeriod;
}
