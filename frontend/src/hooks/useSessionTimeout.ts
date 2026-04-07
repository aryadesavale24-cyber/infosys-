import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface UseSessionTimeoutOptions {
    timeoutMinutes?: number;
    warningMinutes?: number;
}

export const useSessionTimeout = (options: UseSessionTimeoutOptions = {}) => {
    const { timeoutMinutes = 30, warningMinutes = 2 } = options;
    const { logout, user } = useAuth();
    const navigate = useNavigate();

    const [showWarning, setShowWarning] = useState(false);
    const [remainingTime, setRemainingTime] = useState(0);

    const timeoutRef = useRef<number | null>(null);
    const warningRef = useRef<number | null>(null);
    const countdownRef = useRef<number | null>(null);
    const lastActivityRef = useRef<number>(Date.now());

    // Convert minutes to milliseconds
    const TIMEOUT_MS = timeoutMinutes * 60 * 1000;
    const WARNING_MS = warningMinutes * 60 * 1000;

    const clearAllTimers = useCallback(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (warningRef.current) clearTimeout(warningRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);
    }, []);

    const handleLogout = useCallback(() => {
        clearAllTimers();
        setShowWarning(false);
        logout();
        navigate('/login', {
            state: {
                message: 'Your session has expired due to inactivity. Please login again.'
            }
        });
    }, [clearAllTimers, logout, navigate]);

    const startCountdown = useCallback(() => {
        setRemainingTime(WARNING_MS / 1000);

        countdownRef.current = setInterval(() => {
            setRemainingTime((prev) => {
                if (prev <= 1) {
                    clearInterval(countdownRef.current!);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, [WARNING_MS]);

    const resetTimer = useCallback(() => {
        clearAllTimers();
        setShowWarning(false);
        lastActivityRef.current = Date.now();

        // Set warning timer (shows popup before logout)
        warningRef.current = setTimeout(() => {
            setShowWarning(true);
            startCountdown();
        }, TIMEOUT_MS - WARNING_MS);

        // Set logout timer (auto logout)
        timeoutRef.current = setTimeout(() => {
            handleLogout();
        }, TIMEOUT_MS);
    }, [clearAllTimers, handleLogout, startCountdown, TIMEOUT_MS, WARNING_MS]);

    const extendSession = useCallback(() => {
        setShowWarning(false);
        resetTimer();
    }, [resetTimer]);

    useEffect(() => {
        // Only start timer if user is logged in
        if (!user) {
            clearAllTimers();
            return;
        }

        // Events that indicate user activity
        const events = [
            'mousedown',
            'mousemove',
            'keypress',
            'scroll',
            'touchstart',
            'click',
        ];

        // Throttle activity detection to avoid too many resets
        let throttleTimeout: number | null = null;

        const handleActivity = () => {
            const now = Date.now();
            const timeSinceLastActivity = now - lastActivityRef.current;

            // Only reset if more than 1 second has passed since last activity
            if (timeSinceLastActivity > 1000) {
                if (throttleTimeout) clearTimeout(throttleTimeout);

                throttleTimeout = setTimeout(() => {
                    resetTimer();
                }, 500);
            }
        };

        // Add event listeners
        events.forEach((event) => {
            window.addEventListener(event, handleActivity);
        });

        // Start initial timer
        resetTimer();

        // Cleanup
        return () => {
            events.forEach((event) => {
                window.removeEventListener(event, handleActivity);
            });
            clearAllTimers();
            if (throttleTimeout) clearTimeout(throttleTimeout);
        };
    }, [user, resetTimer, clearAllTimers]);

    return {
        showWarning,
        remainingTime,
        extendSession,
        handleLogout,
    };
};
