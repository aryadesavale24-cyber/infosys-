package com.inventra.inventory.service;

import com.inventra.inventory.dto.StockAlertDTO;
import com.inventra.inventory.dto.StockAlertSummaryDTO;
import com.inventra.inventory.exception.ResourceNotFoundException;
import com.inventra.inventory.model.*;
import com.inventra.inventory.repository.StockAlertRepository;
import com.inventra.inventory.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class StockAlertService {

    private final StockAlertRepository stockAlertRepository;
    private final UserRepository userRepository;
    private final RealtimeEventService realtimeEventService;

    /**
     * Check and create low stock alert if needed
     */
    @Transactional
    public void checkAndCreateLowStockAlert(Product product) {
        if (product.isLowStock() && !product.isOutOfStock()) {
            // Check if alert already exists
            Optional<StockAlert> existingAlert = stockAlertRepository
                    .findByProductIdAndAlertStatusAndAlertType(
                            product.getId(),
                            AlertStatus.PENDING,
                            AlertType.LOW_STOCK);

            if (existingAlert.isEmpty()) {
                StockAlert alert = new StockAlert();
                alert.setProduct(product);
                alert.setAlertType(AlertType.LOW_STOCK);
                alert.setCurrentStock(product.getCurrentStock());
                alert.setThresholdValue(product.getReorderLevel());
                alert.setAlertStatus(AlertStatus.PENDING);

                StockAlert saved = stockAlertRepository.save(alert);
                log.info("Low stock alert created for product: {} (SKU: {})",
                        product.getName(), product.getSku());
                realtimeEventService.alertUpdated("CREATED", saved.getId());
            }
        } else if (product.isOutOfStock()) {
            checkAndCreateOutOfStockAlert(product);
        }
    }

    /**
     * Check and create out of stock alert if needed
     */
    @Transactional
    public void checkAndCreateOutOfStockAlert(Product product) {
        if (product.isOutOfStock()) {
            // Check if alert already exists
            Optional<StockAlert> existingAlert = stockAlertRepository
                    .findByProductIdAndAlertStatusAndAlertType(
                            product.getId(),
                            AlertStatus.PENDING,
                            AlertType.OUT_OF_STOCK);

            if (existingAlert.isEmpty()) {
                StockAlert alert = new StockAlert();
                alert.setProduct(product);
                alert.setAlertType(AlertType.OUT_OF_STOCK);
                alert.setCurrentStock(0);
                alert.setThresholdValue(0);
                alert.setAlertStatus(AlertStatus.PENDING);

                StockAlert saved = stockAlertRepository.save(alert);
                log.warn("OUT OF STOCK alert created for product: {} (SKU: {})",
                        product.getName(), product.getSku());
                realtimeEventService.alertUpdated("CREATED", saved.getId());
            }
        }
    }

    /**
     * Check and create overstock alert if needed
     */
    @Transactional
    public void checkAndCreateOverstockAlert(Product product) {
        if (product.isOverStock()) {
            // Check if alert already exists
            Optional<StockAlert> existingAlert = stockAlertRepository
                    .findByProductIdAndAlertStatusAndAlertType(
                            product.getId(),
                            AlertStatus.PENDING,
                            AlertType.OVERSTOCK);

            if (existingAlert.isEmpty()) {
                StockAlert alert = new StockAlert();
                alert.setProduct(product);
                alert.setAlertType(AlertType.OVERSTOCK);
                alert.setCurrentStock(product.getCurrentStock());
                alert.setThresholdValue(product.getMaxStockLevel());
                alert.setAlertStatus(AlertStatus.PENDING);

                StockAlert saved = stockAlertRepository.save(alert);
                log.info("Overstock alert created for product: {} (SKU: {})",
                        product.getName(), product.getSku());
                realtimeEventService.alertUpdated("CREATED", saved.getId());
            }
        }
    }

    /**
     * Resolve low stock / out-of-stock alerts when stock is replenished.
     *
     * Resolves ALL open alerts (both PENDING and ACKNOWLEDGED) so that a
     * manager who already acknowledged a low-stock alert still sees it move to
     * RESOLVED after the restock rather than staying stuck as ACKNOWLEDGED.
     * Broadcasts a real-time "RESOLVED" WebSocket event for every alert resolved.
     */
    @Transactional
    public void checkAndResolveLowStockAlert(Product product) {
        // The two "open" statuses we want to resolve
        List<AlertStatus> openStatuses = List.of(AlertStatus.PENDING, AlertStatus.ACKNOWLEDGED);

        // ── Resolve LOW_STOCK alerts if stock is now above reorder level ──────
        if (!product.isLowStock()) {
            List<StockAlert> lowStockAlerts = stockAlertRepository
                    .findByProductIdAndAlertTypeAndAlertStatusIn(
                            product.getId(), AlertType.LOW_STOCK, openStatuses);

            lowStockAlerts.forEach(alert -> {
                alert.resolve();
                stockAlertRepository.save(alert);
                log.info("Low stock alert RESOLVED for product: {} (SKU: {}) [was {}]",
                        product.getName(), product.getSku(), alert.getId());
                realtimeEventService.alertUpdated("RESOLVED", alert.getId());
            });
        }

        // ── Resolve OUT_OF_STOCK alerts if stock > 0 ─────────────────────────
        if (!product.isOutOfStock()) {
            List<StockAlert> outOfStockAlerts = stockAlertRepository
                    .findByProductIdAndAlertTypeAndAlertStatusIn(
                            product.getId(), AlertType.OUT_OF_STOCK, openStatuses);

            outOfStockAlerts.forEach(alert -> {
                alert.resolve();
                stockAlertRepository.save(alert);
                log.info("Out-of-stock alert RESOLVED for product: {} (SKU: {}) [was {}]",
                        product.getName(), product.getSku(), alert.getId());
                realtimeEventService.alertUpdated("RESOLVED", alert.getId());
            });
        }
    }

    /**
     * Get all pending alerts
     */
    @Transactional(readOnly = true)
    public List<StockAlertDTO> getPendingAlerts() {
        return stockAlertRepository.findPendingAlerts().stream()
                .map(this::convertToDTO)
                .toList();
    }

    /**
     * Get alerts by status
     */
    @Transactional(readOnly = true)
    public Page<StockAlertDTO> getAlertsByStatus(AlertStatus status, Pageable pageable) {
        return stockAlertRepository.findByAlertStatus(status, pageable)
                .map(this::convertToDTO);
    }

    /**
     * Get alerts by type
     */
    @Transactional(readOnly = true)
    public Page<StockAlertDTO> getAlertsByType(AlertType type, Pageable pageable) {
        return stockAlertRepository.findByAlertType(type, pageable)
                .map(this::convertToDTO);
    }

    /**
     * Acknowledge an alert
     */
    @Transactional
    public StockAlertDTO acknowledgeAlert(Long alertId) {
        StockAlert alert = stockAlertRepository.findById(alertId)
                .orElseThrow(() -> new ResourceNotFoundException("Alert not found with ID: " + alertId));

        User currentUser = getCurrentUser();
        alert.acknowledge(currentUser);

        StockAlert savedAlert = stockAlertRepository.save(alert);
        log.info("Alert {} acknowledged by user: {}", alertId, currentUser.getUsername());
        realtimeEventService.alertUpdated("ACKNOWLEDGED", alertId);

        return convertToDTO(savedAlert);
    }

    /**
     * Get all alerts (paginated)
     */
    @Transactional(readOnly = true)
    public Page<StockAlertDTO> getAllAlerts(Pageable pageable) {
        return stockAlertRepository.findAll(pageable).map(this::convertToDTO);
    }

    /**
     * Get a summary: counts by status and by type
     */
    @Transactional(readOnly = true)
    public StockAlertSummaryDTO getAlertSummary() {
        long pending = stockAlertRepository.countByAlertStatus(AlertStatus.PENDING);
        long acknowledged = stockAlertRepository.countByAlertStatus(AlertStatus.ACKNOWLEDGED);
        long resolved = stockAlertRepository.countByAlertStatus(AlertStatus.RESOLVED);
        long lowStock = stockAlertRepository.countByAlertType(AlertType.LOW_STOCK);
        long outOfStock = stockAlertRepository.countByAlertType(AlertType.OUT_OF_STOCK);
        long overstock = stockAlertRepository.countByAlertType(AlertType.OVERSTOCK);
        return new StockAlertSummaryDTO(pending, acknowledged, resolved, lowStock, outOfStock, overstock);
    }

    /**
     * Get current authenticated user
     */
    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));
    }

    /**
     * Convert StockAlert entity to DTO
     */
    private StockAlertDTO convertToDTO(StockAlert alert) {
        StockAlertDTO dto = new StockAlertDTO();
        dto.setId(alert.getId());
        dto.setProductId(alert.getProduct().getId());
        dto.setProductName(alert.getProduct().getName());
        dto.setProductSku(alert.getProduct().getSku());
        dto.setAlertType(alert.getAlertType());
        dto.setCurrentStock(alert.getCurrentStock());
        dto.setThresholdValue(alert.getThresholdValue());
        dto.setAlertStatus(alert.getAlertStatus());
        dto.setCreatedAt(alert.getCreatedAt());

        if (alert.getAcknowledgedBy() != null) {
            dto.setAcknowledgedByUsername(alert.getAcknowledgedBy().getUsername());
        }
        dto.setAcknowledgedAt(alert.getAcknowledgedAt());
        dto.setResolvedAt(alert.getResolvedAt());

        return dto;
    }
}
