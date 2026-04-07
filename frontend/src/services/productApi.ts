import api from './api';
import { Product, StockTransaction, Category, StockAlert, StockAlertSummary } from '../types/product';

// Product APIs
export const productApi = {
    getAll: (page = 0, size = 10) =>
        api.get<{ content: Product[]; totalElements: number; totalPages: number }>(`/products?page=${page}&size=${size}`),

    getById: (id: number) =>
        api.get<Product>(`/products/${id}`),

    getBySku: (sku: string) =>
        api.get<Product>(`/products/sku/${sku}`),

    getByBarcode: (barcode: string) =>
        api.get<Product>(`/products/barcode/${barcode}`),

    search: (keyword: string, page = 0, size = 10) =>
        api.get<{ content: Product[]; totalElements: number; totalPages: number }>(`/products/search?keyword=${keyword}&page=${page}&size=${size}`),

    getByCategory: (categoryId: number, page = 0, size = 10) =>
        api.get<{ content: Product[]; totalElements: number; totalPages: number }>(`/products/category/${categoryId}?page=${page}&size=${size}`),

    getLowStock: () =>
        api.get<Product[]>('/products/low-stock'),

    getOutOfStock: () =>
        api.get<Product[]>('/products/out-of-stock'),

    create: (product: Partial<Product>) =>
        api.post<Product>('/products', product),

    update: (id: number, product: Partial<Product>) =>
        api.put<Product>(`/products/${id}`, product),

    changeStatus: (id: number, status: string) =>
        api.patch<Product>(`/products/${id}/status?status=${status}`),

    delete: (id: number) =>
        api.delete(`/products/${id}`),
};

// Stock Transaction APIs
export const stockApi = {
    stockIn: (transaction: Partial<StockTransaction>) =>
        api.post<StockTransaction>('/stock/in', transaction),

    stockOut: (transaction: Partial<StockTransaction>) =>
        api.post<StockTransaction>('/stock/out', transaction),

    adjust: (transaction: Partial<StockTransaction>) =>
        api.post<StockTransaction>('/stock/adjust', transaction),

    getProductTransactions: (productId: number, page = 0, size = 10) =>
        api.get<{ content: StockTransaction[]; totalElements: number; totalPages: number }>(`/stock/transactions/${productId}?page=${page}&size=${size}`),

    getAllTransactions: (page = 0, size = 10) =>
        api.get<{ content: StockTransaction[]; totalElements: number; totalPages: number }>(`/stock/transactions?page=${page}&size=${size}`),

    getByType: (type: string, page = 0, size = 10) =>
        api.get<{ content: StockTransaction[]; totalElements: number; totalPages: number }>(`/stock/transactions/type/${type}?page=${page}&size=${size}`),

    reconcile: (productId: number) =>
        api.get<boolean>(`/stock/reconcile/${productId}`),

    // Staff: transactions scoped to current staff user
    getMyTransactions: (page = 0, size = 10) =>
        api.get<{ content: StockTransaction[]; totalElements: number; totalPages: number }>(`/stock/transactions/me?page=${page}&size=${size}`),

    // Manager/Admin: transactions scoped to caller's assigned categories
    getMyCategoryTransactions: () =>
        api.get<StockTransaction[]>('/stock/transactions/my-categories'),
};

// Category APIs
export const categoryApi = {
    getAll: () =>
        api.get<Category[]>('/categories'),

    getById: (id: number) =>
        api.get<Category>(`/categories/${id}`),

    getRoot: () =>
        api.get<Category[]>('/categories/root'),

    getSubCategories: (id: number) =>
        api.get<Category[]>(`/categories/${id}/sub-categories`),

    create: (category: Partial<Category>) =>
        api.post<Category>('/categories', category),

    update: (id: number, category: Partial<Category>) =>
        api.put<Category>(`/categories/${id}`, category),

    delete: (id: number) =>
        api.delete(`/categories/${id}`),
};

// Stock Alert APIs
export const alertApi = {
    // All pending alerts — used by dashboard badge
    getPending: () =>
        api.get<StockAlert[]>('/alerts/pending'),

    // All alerts paginated — used by Stock Alerts management page
    getAll: (page = 0, size = 10) =>
        api.get<{ content: StockAlert[]; totalElements: number; totalPages: number }>(`/alerts?page=${page}&size=${size}&sort=createdAt,desc`),

    // Count summary — used by dashboard widget chip
    getSummary: () =>
        api.get<StockAlertSummary>('/alerts/summary'),

    getByStatus: (status: string, page = 0, size = 10) =>
        api.get<{ content: StockAlert[]; totalElements: number; totalPages: number }>(`/alerts/status/${status}?page=${page}&size=${size}&sort=createdAt,desc`),

    getByType: (type: string, page = 0, size = 10) =>
        api.get<{ content: StockAlert[]; totalElements: number; totalPages: number }>(`/alerts/type/${type}?page=${page}&size=${size}&sort=createdAt,desc`),

    acknowledge: (id: number) =>
        api.patch<StockAlert>(`/alerts/${id}/acknowledge`),
};
