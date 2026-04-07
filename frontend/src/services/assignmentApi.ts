import api from './api';

export interface StaffUser {
    id: number;
    username: string;
    fullName: string;
    email: string;
    enabled: boolean;
}

export interface StaffCategoryAssignment {
    id: number;
    staffId: number;
    staffUsername: string;
    staffFullName: string;
    staffEmail: string;
    categoryId: number;
    categoryName: string;
    assignedById: number;
    assignedByUsername: string;
    assignedAt: string;
    isActive: boolean;
    notes?: string;
}

export interface AssignedProduct {
    id: number;
    name: string;
    sku: string;
    currentStock: number;
    sellingPrice: number;
    categoryId: number;
    categoryName: string;
    unit: string;
}

export const assignmentApi = {
    // Manager: assign a category to staff
    assign: (staffId: number, categoryId: number, notes?: string) =>
        api.post<StaffCategoryAssignment>('/staff-assignments/assign', { staffId, categoryId, notes }),

    // Manager: remove an assignment
    remove: (assignmentId: number) =>
        api.delete(`/staff-assignments/${assignmentId}`),

    // Manager: get all assignments I made
    getMyAssignments: () =>
        api.get<StaffCategoryAssignment[]>('/staff-assignments/my-assignments'),

    // Manager: get assignments for a specific staff member
    getAssignmentsForStaff: (staffId: number) =>
        api.get<StaffCategoryAssignment[]>(`/staff-assignments/staff/${staffId}`),

    // Manager: list all STAFF-role users
    getAllStaffUsers: () =>
        api.get<StaffUser[]>('/staff-assignments/staff-users'),

    // Manager/Admin: get categories this caller can assign to staff
    // ADMIN → all categories | MANAGER → only their Admin-assigned categories
    getAssignableCategories: () =>
        api.get<{ id: number; name: string }[]>('/staff-assignments/assignable-categories'),

    // Staff: get products in my assigned categories
    getMyProducts: () =>
        api.get<AssignedProduct[]>('/staff-assignments/my-products'),

    // Staff: get my assigned category IDs
    getMyCategoryIds: () =>
        api.get<number[]>('/staff-assignments/my-categories'),

    // Staff: get my full assignment records
    getMyStaffAssignments: () =>
        api.get<StaffCategoryAssignment[]>('/staff-assignments/my-staff-assignments'),
};
