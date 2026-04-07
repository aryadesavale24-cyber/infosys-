import api from './api';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ReturnStatus =
    | 'PENDING'
    | 'APPROVED_RESTOCK'
    | 'APPROVED_DAMAGE'
    | 'REJECTED';

export type ReturnReason =
    | 'DEFECTIVE'
    | 'WRONG_ITEM'
    | 'CUSTOMER_CHANGED_MIND'
    | 'EXPIRED'
    | 'DAMAGED_IN_TRANSIT'
    | 'QUALITY_ISSUE';

export type ItemCondition = 'GOOD' | 'DEFECTIVE' | 'DAMAGED';

export interface ReturnRequest {
    id: number;
    productId: number;
    productName: string;
    productSku: string;
    categoryName: string;
    // Supplier (may be absent if product has no supplier)
    supplierId?: number;
    supplierName?: string;
    supplierEmail?: string;
    // Product pricing
    productCostPrice?: number;
    productSellingPrice?: number;
    // Financial impact (null = PENDING, 0 = RESTOCK/REJECT, N = DAMAGE write-off)
    estimatedLoss?: number;
    quantity: number;
    returnReason: ReturnReason;
    itemCondition: ItemCondition;
    originalSaleRef?: string;
    customerName?: string;
    staffNotes?: string;
    managerNotes?: string;
    staffId: number;
    staffUsername: string;
    staffFullName: string;
    managerId: number;
    managerUsername: string;
    managerFullName: string;
    status: ReturnStatus;
    stockTransactionId?: number;
    requestedAt: string;
    resolvedAt?: string;
}

// ── API calls ──────────────────────────────────────────────────────────────────

export const returnApi = {
    // STAFF / ALL: raise a new return request
    raiseReturn: (payload: {
        productId: number;
        quantity: number;
        returnReason: ReturnReason;
        itemCondition: ItemCondition;
        managerId: number;
        originalSaleRef?: string;
        customerName?: string;
        staffNotes?: string;
    }) => api.post<ReturnRequest>('/returns/request', payload),

    // STAFF: view my own return requests
    getMyReturns: () =>
        api.get<ReturnRequest[]>('/returns/my-requests'),

    // MANAGER: pending returns directed at me
    getPending: () =>
        api.get<ReturnRequest[]>('/returns/pending'),

    // MANAGER: all returns directed at me (history)
    getAll: () =>
        api.get<ReturnRequest[]>('/returns/all'),

    // MANAGER: returns for a specific product
    getByProduct: (productId: number) =>
        api.get<ReturnRequest[]>(`/returns/product/${productId}`),

    // MANAGER: pending badge count
    getPendingCount: () =>
        api.get<{ count: number }>('/returns/pending-count'),

    // MANAGER: approve → RESTOCK (item is good, goes back to shelf)
    approveRestock: (requestId: number, note?: string) =>
        api.post<ReturnRequest>(`/returns/${requestId}/approve-restock`, { note }),

    // MANAGER: approve → DAMAGE (item is defective, written off)
    approveDamage: (requestId: number, note?: string) =>
        api.post<ReturnRequest>(`/returns/${requestId}/approve-damage`, { note }),

    // MANAGER: reject the return
    reject: (requestId: number, note?: string) =>
        api.post<ReturnRequest>(`/returns/${requestId}/reject`, { note }),

    // ADMIN: all returns system-wide (newest first)
    adminGetAll: () =>
        api.get<ReturnRequest[]>('/returns/admin/all'),

    // ADMIN: filter by status
    adminGetByStatus: (status: ReturnStatus) =>
        api.get<ReturnRequest[]>(`/returns/admin/status/${status}`),
};
