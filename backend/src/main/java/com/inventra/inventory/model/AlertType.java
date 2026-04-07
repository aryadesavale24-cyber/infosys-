package com.inventra.inventory.model;

public enum AlertType {
    LOW_STOCK, // Stock is below reorder level
    OUT_OF_STOCK, // Stock is zero
    OVERSTOCK // Stock exceeds maximum level
}
