package com.inventra.inventory.model;

public enum ItemCondition {
    GOOD, // Resaleable — can go back on the shelf
    DEFECTIVE, // Cannot be resold — must be written off
    DAMAGED // Physical damage — must be written off
}
