package com.inventra.inventory.model;

public enum ReturnReason {
    DEFECTIVE, // Item stopped working / was faulty on arrival
    WRONG_ITEM, // Wrong product was sold / dispatched
    CUSTOMER_CHANGED_MIND, // Customer no longer wants the item
    EXPIRED, // Item expired before use
    DAMAGED_IN_TRANSIT, // Physical damage during shipping/delivery
    QUALITY_ISSUE // Item does not meet customer expectations
}
