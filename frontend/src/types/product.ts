export interface Product {
    id: number;
    sku: string;
    barcode?: string;
    name: string;
    description?: string;
    categoryId?: number;
    categoryName?: string;
    subCategoryId?: number;
    subCategoryName?: string;
    costPrice: number;
    sellingPrice: number;
    currency: string;
    currentStock: number;
    reorderLevel: number;
    maxStockLevel?: number;
    status: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED';
    manufacturer?: string;
    brand?: string;
    unitOfMeasure?: string;
    weight?: number;
    dimensions?: string;
    imageUrl?: string;
    isLowStock: boolean;
    isOutOfStock: boolean;
    profitMargin: number;
    stockValue: number;
    createdAt: string;
    updatedAt: string;
    createdByUsername?: string;
    updatedByUsername?: string;
}

export interface StockTransaction {
    id: number;
    productId: number;
    productName: string;
    productSku: string;
    transactionType: 'PURCHASE' | 'SALE' | 'RETURN' | 'ADJUSTMENT' | 'DAMAGE' | 'TRANSFER';
    quantity: number;
    stockBefore: number;
    stockAfter: number;
    referenceNumber?: string;
    supplierId?: number;
    customerId?: number;
    warehouseId?: number;
    unitPrice?: number;
    totalAmount?: number;
    notes?: string;
    reason?: string;
    transactionDate: string;
    performedByUsername: string;
    performedByFullName?: string;
    approvedByUsername?: string;
    categoryName?: string;
}

export interface Category {
    id: number;
    name: string;
    description?: string;
    parentCategoryId?: number;
    parentCategoryName?: string;
    subCategories?: Category[];
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface StockAlert {
    id: number;
    productId: number;
    productName: string;
    productSku: string;
    alertType: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'OVERSTOCK';
    currentStock: number;
    thresholdValue: number;
    alertStatus: 'PENDING' | 'ACKNOWLEDGED' | 'RESOLVED';
    createdAt: string;
    acknowledgedByUsername?: string;
    acknowledgedAt?: string;
    resolvedAt?: string;
}

export interface StockAlertSummary {
    pendingCount: number;
    acknowledgedCount: number;
    resolvedCount: number;
    lowStockCount: number;
    outOfStockCount: number;
    overstockCount: number;
}
