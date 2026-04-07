import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

/**
 * Polls /auth/validate-session every `checkInterval` ms.
 * When the server says the session is invalid (logout from another tab / force-logout),
 * it clears React state (via clearUser) AND navigates to /login — so no hard reload needed.
 */
export const useSessionMonitor = (checkInterval: number = 3000) => {
    const navigate = useNavigate();
    const { clearUser } = useAuth();
    const intervalRef = useRef<number | null>(null);
    const isCheckingRef = useRef(false);

    useEffect(() => {
        const checkSessionValidity = async () => {
            if (isCheckingRef.current) return;

            const token = sessionStorage.getItem('token');
            if (!token) return;

            isCheckingRef.current = true;

            try {
                const response = await api.get('/auth/validate-session');

                if (response.data.valid === false) {
                    console.log('Session invalidated — logging out');
                    if (intervalRef.current) {
                        clearInterval(intervalRef.current);
                        intervalRef.current = null;
                    }
                    clearUser();   // ← updates React state, not just localStorage
                    navigate('/login', {
                        state: { message: 'Your session has been terminated. Please login again.' },
                    });
                }
            } catch (error: any) {
                if (error.response?.status === 401) {
                    console.log('Session invalid (401) — logging out');
                    if (intervalRef.current) {
                        clearInterval(intervalRef.current);
                        intervalRef.current = null;
                    }
                    clearUser();
                    navigate('/login', {
                        state: { message: 'Your session has been terminated. Please login again.' },
                    });
                }
                // Ignore transient network errors
            } finally {
                isCheckingRef.current = false;
            }
        };

        intervalRef.current = setInterval(checkSessionValidity, checkInterval);
        checkSessionValidity();

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [navigate, clearUser, checkInterval]);
};

export default useSessionMonitor;
