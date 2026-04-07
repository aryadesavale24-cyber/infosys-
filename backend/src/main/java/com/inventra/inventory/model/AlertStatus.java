package com.inventra.inventory.model;

public enum AlertStatus {
    PENDING, // Alert created but not yet acknowledged
    ACKNOWLEDGED, // Alert has been seen by a user
    RESOLVED // Alert has been resolved (stock replenished)
}
