package com.inventra.inventory.dto.analytics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecommendationDTO {

    public enum Priority {
        CRITICAL, HIGH, MEDIUM, LOW
    }

    public enum Category {
        REORDER, OVERSTOCK, PRICING, RETURN_ANOMALY, PERFORMANCE, SLOW_MOVER
    }

    private String id; // Unique stable ID (for dismiss in localStorage)
    private Priority priority;
    private Category category;
    private String title;
    private String description;
    private String actionLabel; // e.g. "Reorder Now"
    private String affectedEntity; // product or category name
    private BigDecimal potentialImpact; // Estimated ₹ impact
    private String metric; // e.g. "Stock: 3 / Min: 25"
}
