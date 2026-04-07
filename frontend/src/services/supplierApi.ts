import api from './api';
import { Supplier, SupplierStats } from '../types/supplier';

export const supplierApi = {
    // Public registration
    register: (supplier: Partial<Supplier>) =>
        api.post<Supplier>('/suppliers/register', supplier),

    // Admin endpoints
    getPending: () =>
        api.get<Supplier[]>('/suppliers/pending'),

    approve: (id: number, remarks?: string) =>
        api.post<Supplier>(`/suppliers/${id}/approve`, { remarks }),

    reject: (id: number, reason: string) =>
        api.post<Supplier>(`/suppliers/${id}/reject`, { reason }),

    getAll: (page = 0, size = 10) =>
        api.get<{ content: Supplier[]; totalElements: number; totalPages: number }>(`/suppliers?page=${page}&size=${size}`),

    getByStatus: (status: string, page = 0, size = 10) =>
        api.get<{ content: Supplier[]; totalElements: number; totalPages: number }>(`/suppliers/status/${status}?page=${page}&size=${size}`),

    suspend: (id: number, reason: string) =>
        api.post<Supplier>(`/suppliers/${id}/suspend`, { reason }),

    reactivate: (id: number) =>
        api.post<Supplier>(`/suppliers/${id}/reactivate`),

    getStats: () =>
        api.get<SupplierStats>('/suppliers/stats'),

    // Manager/Admin endpoints
    getVerified: () =>
        api.get<Supplier[]>('/suppliers/verified'),

    getById: (id: number) =>
        api.get<Supplier>(`/suppliers/${id}`),

    search: (keyword: string, page = 0, size = 10) =>
        api.get<{ content: Supplier[]; totalElements: number; totalPages: number }>(`/suppliers/search?keyword=${keyword}&page=${page}&size=${size}`),

    update: (id: number, supplier: Partial<Supplier>) =>
        api.put<Supplier>(`/suppliers/${id}`, supplier),
};
