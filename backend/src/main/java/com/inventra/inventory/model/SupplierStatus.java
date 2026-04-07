package com.inventra.inventory.model;

public enum SupplierStatus {
    PENDING, // Awaiting admin approval
    APPROVED, // Verified and can supply
    REJECTED, // Rejected by admin
    SUSPENDED // Temporarily suspended
}
