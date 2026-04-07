import api from './api';

export interface OnlineManager {
    id: number;
    username: string;
    fullName: string;
    lastActiveAt: string;
    isOnline: boolean;
}

export interface ApprovalRequest {
    id: number;
    productId: number;
    productName: string;
    productSku: string;
    categoryName: string;
    quantity: number;
    notes?: string;
    referenceNumber?: string;
    staffId: number;
    staffUsername: string;
    staffFullName: string;
    managerId: number;
    managerUsername: string;
    managerFullName: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    managerNote?: string;
    requestedAt: string;
    resolvedAt?: string;
}

export const approvalApi = {
    // STAFF: get online managers for a product's category
    getOnlineManagers: (productId: number) =>
        api.get<OnlineManager[]>(`/approvals/online-managers/${productId}`),

    // STAFF: raise an approval request
    requestApproval: (
        productId: number,
        quantity: number,
        managerId: number,
        notes?: string,
        referenceNumber?: string
    ) =>
        api.post<ApprovalRequest>('/approvals/request', {
            productId, quantity, managerId, notes, referenceNumber,
        }),

    // STAFF: my requests and their status
    getMyRequests: () =>
        api.get<ApprovalRequest[]>('/approvals/my-requests'),

    // MANAGER: pending requests
    getPending: () =>
        api.get<ApprovalRequest[]>('/approvals/pending'),

    // MANAGER: all requests (full history)
    getAll: () =>
        api.get<ApprovalRequest[]>('/approvals/all'),

    // MANAGER: approve
    approve: (requestId: number, note?: string) =>
        api.post<ApprovalRequest>(`/approvals/${requestId}/approve`, { note }),

    // MANAGER: reject
    reject: (requestId: number, note?: string) =>
        api.post<ApprovalRequest>(`/approvals/${requestId}/reject`, { note }),
};
