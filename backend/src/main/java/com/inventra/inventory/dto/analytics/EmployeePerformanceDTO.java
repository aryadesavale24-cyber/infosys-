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
public class EmployeePerformanceDTO {
    private Long userId;
    private String username;
    private String fullName;
    private String role;
    private Integer transactionCount;
    private Integer unitsSold;
    private BigDecimal totalSaleValue;
    private Integer returnRequestsRaised;
}
