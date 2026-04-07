/**
 * useWebSocket.ts
 *
 * Reusable hook for STOMP-over-native-WebSocket.
 * Uses @stomp/stompjs brokerURL (no SockJS needed, avoids the
 * "global is not defined" error in Vite).
 *
 * Usage:
 *   const { subscribe } = useWebSocket();
 *   useEffect(() => {
 *     const unsub = subscribe('/topic/products', fetchProducts);
 *     return unsub;
 *   }, [subscribe, fetchProducts]);
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { Client, StompSubscription } from '@stomp/stompjs';

const WS_URL = 'ws://localhost:8080/ws';

// ── Singleton client shared across hook instances in the same tab ────────────
let globalClient: Client | null = null;

type Callback = () => void;
type Pending = { topic: string; cb: Callback; uid: string };
let pendingSubscriptions: Pending[] = [];

type Unsubscribe = () => void;

// ── Singleton initialiser (run once) ────────────────────────────────────────
function ensureClient() {
    if (globalClient) return;

    globalClient = new Client({
        brokerURL: WS_URL,
        reconnectDelay: 5000,
        onConnect: () => {
            console.log('[WS] Connected – replaying', pendingSubscriptions.length, 'queued subs');
            pendingSubscriptions.forEach(({ topic, cb }) => {
                globalClient!.subscribe(topic, () => cb());
            });
            pendingSubscriptions = [];
            window.dispatchEvent(new CustomEvent('ws-connected'));
        },
        onDisconnect: () => {
            console.log('[WS] Disconnected');
            window.dispatchEvent(new CustomEvent('ws-disconnected'));
        },
        onStompError: (frame) => {
            console.error('[WS] STOMP error', frame.headers?.message ?? frame);
        },
        onWebSocketError: (evt) => {
            console.warn('[WS] WebSocket error', evt);
        },
    });

    globalClient.activate();
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useWebSocket() {
    const [connected, setConnected] = useState(
        () => !!(globalClient?.connected)
    );
    // Track subscriptions owned by this hook instance for cleanup
    const ownedSubs = useRef<Map<string, StompSubscription | Pending>>(new Map());

    useEffect(() => {
        ensureClient();

        const onConn = () => setConnected(true);
        const onDisc = () => setConnected(false);
        window.addEventListener('ws-connected', onConn);
        window.addEventListener('ws-disconnected', onDisc);
        if (globalClient?.connected) setConnected(true);

        return () => {
            window.removeEventListener('ws-connected', onConn);
            window.removeEventListener('ws-disconnected', onDisc);
            // Unsubscribe everything this instance registered
            ownedSubs.current.forEach((sub) => {
                if ('unsubscribe' in sub) {
                    try { (sub as StompSubscription).unsubscribe(); } catch (_) { }
                }
            });
            ownedSubs.current.clear();
        };
    }, []);

    /**
     * Subscribe to a STOMP topic.  Returns an unsubscribe function.
     * Safe to call before the socket connects — queues automatically.
     */
    const subscribe = useCallback((topic: string, cb: Callback): Unsubscribe => {
        const uid = `${topic}::${Math.random().toString(36).slice(2)}`;

        if (globalClient?.connected) {
            const stompSub = globalClient.subscribe(topic, () => cb());
            ownedSubs.current.set(uid, stompSub);
            return () => {
                try { stompSub.unsubscribe(); } catch (_) { }
                ownedSubs.current.delete(uid);
            };
        }

        // Not yet connected — queue
        const pending: Pending = { topic, cb, uid };
        pendingSubscriptions.push(pending);
        ownedSubs.current.set(uid, pending);

        return () => {
            pendingSubscriptions = pendingSubscriptions.filter(p => p.uid !== uid);
            ownedSubs.current.delete(uid);
        };
    }, []);

    return { subscribe, connected };
}
