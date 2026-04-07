export enum Role {
    ADMIN = 'ADMIN',
    MANAGER = 'MANAGER',
    STAFF = 'STAFF'
}

export interface User {
    id: number;
    username: string;
    email: string;
    fullName: string;
    role: Role;
    enabled: boolean;
    createdAt: string;
    updatedAt: string;
    failedLoginAttempts?: number;
    accountLockedUntil?: string;
}

export interface AuthRequest {
    username: string;
    password: string;
    selectedRole?: Role;
}

export interface RegisterRequest {
    username: string;
    email: string;
    password: string;
    fullName: string;
    role?: Role;
}

export interface AuthResponse {
    token: string;
    user: User;
    message: string;
}

export interface ErrorResponse {
    timestamp: string;
    status: number;
    error: string;
    message: string;
    path: string;
    validationErrors?: Record<string, string>;
}
