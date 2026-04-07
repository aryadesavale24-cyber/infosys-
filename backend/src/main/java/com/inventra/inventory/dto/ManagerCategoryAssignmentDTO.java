package com.inventra.inventory.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ManagerCategoryAssignmentDTO {

    private Long id;

    // Manager info
    private Long managerId;
    private String managerUsername;
    private String managerFullName;
    private String managerEmail;

    // Category info
    private Long categoryId;
    private String categoryName;

    // Assignment meta
    private Long assignedById;
    private String assignedByUsername;
    private LocalDateTime assignedAt;
    private Boolean isActive;
    private String notes;

    // How many categories this manager currently has (for UI limit display)
    private long totalAssignedCount;
}
