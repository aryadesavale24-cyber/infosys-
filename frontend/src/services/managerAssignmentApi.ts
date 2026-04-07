import api from './api';

export interface ManagerUser {
    id: number;
    username: string;
    fullName: string;
    email: string;
    assignedCategoryCount: number;
    canAssignMore: boolean;
    maxCategories: number;
}

export interface ManagerCategoryAssignment {
    id: number;
    managerId: number;
    managerUsername: string;
    managerFullName: string;
    managerEmail: string;
    categoryId: number;
    categoryName: string;
    assignedById: number;
    assignedByUsername: string;
    assignedAt: string;
    isActive: boolean;
    notes?: string;
    totalAssignedCount: number;
}

export interface ManagerProduct {
    id: number;
    name: string;
    sku: string;
    brand?: string;
    manufacturer?: string;
    currentStock: number;
    reorderLevel: number;
    maxStockLevel?: number;
    costPrice: number;
    sellingPrice: number;
    status: string;
    categoryId: number;
    categoryName: string;
    unit?: string;
    isLowStock: boolean;
    isOutOfStock: boolean;
}

export interface CoManager {
    categoryId: number;
    categoryName: string;
    managerId: number;
    managerUsername: string;
    managerFullName: string;
    managerEmail: string;
    assignedAt: string;
}

export const managerAssignmentApi = {
    // Admin: assign a category to a manager
    assign: (managerId: number, categoryId: number, notes?: string) =>
        api.post<ManagerCategoryAssignment>('/manager-assignments/assign', { managerId, categoryId, notes }),

    // Admin: remove a manager assignment
    remove: (assignmentId: number) =>
        api.delete(`/manager-assignments/${assignmentId}`),

    // Admin: get all assignments
    getAll: () =>
        api.get<ManagerCategoryAssignment[]>('/manager-assignments/all'),

    // Admin: get assignments for a specific manager
    getForManager: (managerId: number) =>
        api.get<ManagerCategoryAssignment[]>(`/manager-assignments/manager/${managerId}`),

    // Admin: list all MANAGER-role users with assignment counts
    getAllManagerUsers: () =>
        api.get<ManagerUser[]>('/manager-assignments/manager-users'),

    // Manager: get their own assignments
    getMyAssignments: () =>
        api.get<ManagerCategoryAssignment[]>('/manager-assignments/my-assignments'),

    // Manager: get their own category IDs
    getMyCategoryIds: () =>
        api.get<number[]>('/manager-assignments/my-category-ids'),

    // Manager: get products in their assigned categories only
    getMyProducts: () =>
        api.get<ManagerProduct[]>('/manager-assignments/my-products'),

    // Manager: get other managers who share the same categories
    getCoManagers: () =>
        api.get<CoManager[]>('/manager-assignments/co-managers'),
};
