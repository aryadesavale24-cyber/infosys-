package com.inventra.inventory.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.*;

/**
 * Configures STOMP-over-WebSocket.
 *
 * Clients connect to: ws://localhost:8080/ws (via SockJS fallback)
 * Subscribe to topics: /topic/products, /topic/stock, /topic/approvals,
 * /topic/users, /topic/suppliers, /topic/alerts
 * Send to server: /app/... (not used from client in this setup)
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Enable simple in-memory broker for the /topic prefix
        registry.enableSimpleBroker("/topic");
        // Prefix for messages routed to @MessageMapping methods
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("http://localhost:*");
        // Note: no SockJS fallback — frontend uses native WebSocket via @stomp/stompjs
        // brokerURL
    }
}
