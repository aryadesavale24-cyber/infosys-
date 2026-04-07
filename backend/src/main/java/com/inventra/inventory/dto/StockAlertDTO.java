package com.inventra.inventory.dto;

import com.inventra.inventory.model.AlertStatus;
import com.inventra.inventory.model.AlertType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StockAlertDTO {

    private Long id;
    private Long productId;
    private String productName;
    private String productSku;
    private AlertType alertType;
    private Integer currentStock;
    private Integer thresholdValue;
    private AlertStatus alertStatus;
    private LocalDateTime createdAt;
    private String acknowledgedByUsername;
    private LocalDateTime acknowledgedAt;
    private LocalDateTime resolvedAt;
}
