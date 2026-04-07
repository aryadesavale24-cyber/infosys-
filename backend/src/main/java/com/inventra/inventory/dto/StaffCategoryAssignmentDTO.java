package com.inventra.inventory.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StaffCategoryAssignmentDTO {

    private Long id;

    // Staff info
    private Long staffId;
    private String staffUsername;
    private String staffFullName;
    private String staffEmail;

    // Category info
    private Long categoryId;
    private String categoryName;

    // Assignment info
    private Long assignedById;
    private String assignedByUsername;
    private LocalDateTime assignedAt;
    private Boolean isActive;
    private String notes;
}
