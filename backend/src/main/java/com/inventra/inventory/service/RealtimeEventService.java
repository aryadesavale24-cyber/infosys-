package com.inventra.inventory.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;

/**
 * Central service that broadcasts real-time events to all connected WebSocket
 * clients via STOMP topics.
 *
 * Topic map:
 * /topic/products — product created / updated / deleted
 * /topic/stock — stock-in / stock-out
 * /topic/approvals — approval request raised / resolved
 * /topic/returns — return request raised / resolved
 * /topic/users — user created / updated / deleted
 * /topic/suppliers — supplier status changed
 * /topic/alerts — low-stock / out-of-stock alert fired
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RealtimeEventService {

    private final SimpMessagingTemplate broker;

    // ── Topics ────────────────────────────────────────────────────────────────
    public static final String TOPIC_PRODUCTS = "/topic/products";
    public static final String TOPIC_STOCK = "/topic/stock";
    public static final String TOPIC_APPROVALS = "/topic/approvals";
    public static final String TOPIC_RETURNS = "/topic/returns";
    public static final String TOPIC_USERS = "/topic/users";
    public static final String TOPIC_SUPPLIERS = "/topic/suppliers";
    public static final String TOPIC_ALERTS = "/topic/alerts";

    // ── Public helpers ────────────────────────────────────────────────────────

    public void productUpdated(String action, Long productId) {
        broadcast(TOPIC_PRODUCTS, action, productId, null);
    }

    public void stockUpdated(String action, Long productId) {
        broadcast(TOPIC_STOCK, action, productId, null);
    }

    public void approvalUpdated(String action, Long requestId) {
        broadcast(TOPIC_APPROVALS, action, requestId, null);
    }

    public void userUpdated(String action, Long userId) {
        broadcast(TOPIC_USERS, action, userId, null);
    }

    public void supplierUpdated(String action, Long supplierId) {
        broadcast(TOPIC_SUPPLIERS, action, supplierId, null);
    }

    public void alertUpdated(String action, Long alertId) {
        broadcast(TOPIC_ALERTS, action, alertId, null);
    }

    public void returnUpdated(String action, Long returnRequestId) {
        broadcast(TOPIC_RETURNS, action, returnRequestId, null);
    }

    // ── Internal broadcast ────────────────────────────────────────────────────

    private void broadcast(String topic, String action, Long entityId, String extra) {
        Map<String, Object> payload = Map.of(
                "action", action,
                "id", entityId != null ? entityId : 0L,
                "timestamp", Instant.now().toEpochMilli());
        log.debug("WS broadcast → {} : {}", topic, payload);
        broker.convertAndSend(topic, payload);
    }
}
