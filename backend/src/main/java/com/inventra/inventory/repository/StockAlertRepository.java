package com.inventra.inventory.repository;

import com.inventra.inventory.model.AlertStatus;
import com.inventra.inventory.model.AlertType;
import com.inventra.inventory.model.StockAlert;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StockAlertRepository extends JpaRepository<StockAlert, Long> {

    // Find by product
    List<StockAlert> findByProductId(Long productId);

    Page<StockAlert> findByProductId(Long productId, Pageable pageable);

    // Find by alert type
    Page<StockAlert> findByAlertType(AlertType alertType, Pageable pageable);

    // Find by alert status
    Page<StockAlert> findByAlertStatus(AlertStatus alertStatus, Pageable pageable);

    // Find pending alerts
    @Query("SELECT sa FROM StockAlert sa WHERE sa.alertStatus = 'PENDING' ORDER BY sa.createdAt DESC")
    List<StockAlert> findPendingAlerts();

    // Find pending alerts for a product
    Optional<StockAlert> findByProductIdAndAlertStatusAndAlertType(Long productId, AlertStatus alertStatus,
            AlertType alertType);

    // Count pending alerts
    long countByAlertStatus(AlertStatus alertStatus);

    // Count by alert type
    long countByAlertType(AlertType alertType);

    // Find all non-resolved (PENDING or ACKNOWLEDGED) alerts for a product+type
    // Used when stock is replenished — resolve every open alert regardless of
    // status.
    List<StockAlert> findByProductIdAndAlertTypeAndAlertStatusIn(
            Long productId,
            AlertType alertType,
            List<AlertStatus> statuses);

    // All non-resolved alerts for a product across all types
    List<StockAlert> findByProductIdAndAlertStatusIn(
            Long productId,
            List<AlertStatus> statuses);
}
