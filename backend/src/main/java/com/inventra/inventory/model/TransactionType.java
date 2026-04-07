package com.inventra.inventory.model;

public enum TransactionType {
    PURCHASE, // Stock received from supplier (Stock IN)
    SALE, // Stock sold to customer (Stock OUT)
    RETURN, // Customer returns product (Stock IN)
    ADJUSTMENT, // Manual stock correction (can be IN or OUT)
    DAMAGE, // Damaged/expired items (Stock OUT)
    TRANSFER // Move between warehouses (can be IN or OUT)
}
