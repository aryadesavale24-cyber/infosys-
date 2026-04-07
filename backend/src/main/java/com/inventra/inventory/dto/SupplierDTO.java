package com.inventra.inventory.dto;

import com.inventra.inventory.model.SupplierStatus;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SupplierDTO {

    private Long id;

    @NotBlank(message = "Company name is required")
    @Size(max = 200)
    private String companyName;

    @NotBlank(message = "Contact person name is required")
    @Size(max = 100)
    private String contactPersonName;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @NotBlank(message = "Phone number is required")
    @Pattern(regexp = "^[0-9]{10}$", message = "Phone number must be 10 digits")
    private String phoneNumber;

    @Pattern(regexp = "^$|^[0-9]{10}$", message = "Alternate phone must be 10 digits")
    private String alternatePhone;

    @NotBlank(message = "Address is required")
    private String address;

    @NotBlank(message = "City is required")
    private String city;

    @NotBlank(message = "State is required")
    private String state;

    @NotBlank(message = "Pincode is required")
    @Pattern(regexp = "^[0-9]{6}$", message = "Pincode must be 6 digits")
    private String pincode;

    private String country;

    @NotBlank(message = "GST number is required")
    @Pattern(regexp = "^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$", message = "Invalid GST number format")
    private String gstNumber;

    private String gstCertificatePath;

    @NotBlank(message = "Trade license number is required")
    private String tradeLicenseNumber;

    private String tradeLicensePath;

    @Pattern(regexp = "^$|^[A-Z]{5}[0-9]{4}[A-Z]{1}$", message = "Invalid PAN format")
    private String panNumber;

    private String panCardPath;

    private String bankName;
    private String accountNumber;
    private String ifscCode;
    private String accountHolderName;

    private String businessDescription;
    private String productsSupplied;
    private Integer yearsInBusiness;

    private SupplierStatus status;
    private String adminRemarks;
    private String rejectionReason;

    private LocalDateTime createdAt;
    private LocalDateTime approvedAt;
    private LocalDateTime reviewedAt;

    private Double rating;
    private Integer totalOrders;
    private Boolean isActive;

    private String reviewedByUsername;
    private Long requestedById;
    private String requestedByUsername;
    private String requestedByFullName;
}
