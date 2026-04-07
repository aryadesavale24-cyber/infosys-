import api from './api';
import { AuthRequest, AuthResponse, RegisterRequest, User, Role } from '../types';

export const authService = {
    login: async (credentials: AuthRequest): Promise<AuthResponse> => {
        const response = await api.post<AuthResponse>('/auth/login', credentials);
        return response.data;
    },

    register: async (data: RegisterRequest): Promise<AuthResponse> => {
        const response = await api.post<AuthResponse>('/auth/register', data);
        return response.data;
    },

    getCurrentUser: async (): Promise<User> => {
        const response = await api.get<User>('/auth/me');
        return response.data;
    },

    logout: async (): Promise<void> => {
        try {
            await api.post('/auth/logout');
        } catch (error) {
            console.error('Logout API call failed:', error);
        } finally {
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('user');
        }
    },
};

export const adminService = {
    getAllUsers: async (): Promise<User[]> => {
        const response = await api.get<User[]>('/admin/users');
        return response.data;
    },

    getUsersByRole: async (role: Role): Promise<User[]> => {
        const response = await api.get<User[]>(`/admin/users/role/${role}`);
        return response.data;
    },

    createUser: async (data: RegisterRequest): Promise<void> => {
        await api.post('/admin/users', data);
    },

    updateUser: async (id: number, data: RegisterRequest): Promise<User> => {
        const response = await api.put<User>(`/admin/users/${id}`, data);
        return response.data;
    },

    deleteUser: async (id: number): Promise<void> => {
        await api.delete(`/admin/users/${id}`);
    },

    toggleUserStatus: async (id: number): Promise<User> => {
        const response = await api.patch<User>(`/admin/users/${id}/toggle-status`);
        return response.data;
    },

    unlockUserAccount: async (id: number): Promise<void> => {
        await api.patch(`/admin/users/${id}/unlock`);
    },
};
