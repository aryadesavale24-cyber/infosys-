package com.inventra.inventory.model;

public enum ReturnStatus {
    PENDING, // Awaiting manager inspection & decision
    APPROVED_RESTOCK, // Item is good → restocked (RETURN transaction created)
    APPROVED_DAMAGE, // Item is defective → written off (DAMAGE audit created)
    REJECTED // Return not accepted → stock unchanged
}
