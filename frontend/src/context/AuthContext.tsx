import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, AuthRequest, RegisterRequest, AuthResponse } from '../types';
import { authService } from '../services/authService';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (credentials: AuthRequest) => Promise<void>;
    register: (data: RegisterRequest) => Promise<void>;
    logout: () => void;
    clearUser: () => void;   // ← used by session monitor to sync React state
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// BroadcastChannel lets us sync logout across tabs in the same browser
const authChannel = typeof BroadcastChannel !== 'undefined'
    ? new BroadcastChannel('inventra_auth')
    : null;

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            const token = sessionStorage.getItem('token');
            const storedUser = sessionStorage.getItem('user');

            if (token && storedUser) {
                try {
                    setUser(JSON.parse(storedUser));
                    // Verify token is still valid with backend
                    const currentUser = await authService.getCurrentUser();
                    setUser(currentUser);
                    sessionStorage.setItem('user', JSON.stringify(currentUser));
                } catch (error) {
                    console.error('Auth initialization failed:', error);
                    sessionStorage.removeItem('token');
                    sessionStorage.removeItem('user');
                    setUser(null);
                }
            }
            setLoading(false);
        };

        initAuth();
    }, []);

    // ── Cross-tab sync: if another tab logs out, this tab follows ──────────
    useEffect(() => {
        if (!authChannel) return;
        const handler = (e: MessageEvent) => {
            if (e.data === 'LOGOUT') {
                sessionStorage.removeItem('token');
                sessionStorage.removeItem('user');
                setUser(null);
            }
        };
        authChannel.addEventListener('message', handler);
        return () => authChannel.removeEventListener('message', handler);
    }, []);

    const login = async (credentials: AuthRequest) => {
        const response: AuthResponse = await authService.login(credentials);
        sessionStorage.setItem('token', response.token);
        sessionStorage.setItem('user', JSON.stringify(response.user));
        setUser(response.user);
    };

    const register = async (data: RegisterRequest) => {
        const response: AuthResponse = await authService.register(data);
        sessionStorage.setItem('token', response.token);
        sessionStorage.setItem('user', JSON.stringify(response.user));
        setUser(response.user);
    };

    /** Full logout — calls API, clears state, notifies other tabs */
    const logout = useCallback(() => {
        authService.logout();          // clears localStorage + calls /auth/logout
        setUser(null);
        authChannel?.postMessage('LOGOUT');
    }, []);

    /** Silent state-only clear used by session monitor when server invalidates the session */
    const clearUser = useCallback(() => {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        setUser(null);
        authChannel?.postMessage('LOGOUT');
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                login,
                register,
                logout,
                clearUser,
                isAuthenticated: !!user,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
