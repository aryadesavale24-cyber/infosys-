package com.inventra.inventory.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "suppliers")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Supplier {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Business Information
    @Column(nullable = false, length = 200)
    private String companyName;

    @Column(nullable = false, length = 100)
    private String contactPersonName;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column(nullable = false, length = 20)
    private String phoneNumber;

    @Column(length = 20)
    private String alternatePhone;

    // Address
    @Column(nullable = false, length = 500)
    private String address;

    @Column(nullable = false, length = 100)
    private String city;

    @Column(nullable = false, length = 100)
    private String state;

    @Column(nullable = false, length = 10)
    private String pincode;

    @Column(length = 50)
    private String country = "India";

    // Compliance Documents
    @Column(nullable = false, unique = true, length = 15)
    private String gstNumber; // GST Registration Number (GSTIN)

    @Column(length = 500)
    private String gstCertificatePath; // Path to uploaded GST certificate

    @Column(nullable = false, unique = true, length = 50)
    private String tradeLicenseNumber;

    @Column(length = 500)
    private String tradeLicensePath; // Path to uploaded trade license

    @Column(length = 50)
    private String panNumber;

    @Column(length = 500)
    private String panCardPath;

    // Bank Details (Optional)
    @Column(length = 100)
    private String bankName;

    @Column(length = 50)
    private String accountNumber;

    @Column(length = 11)
    private String ifscCode;

    @Column(length = 100)
    private String accountHolderName;

    // Business Details
    @Column(length = 1000)
    private String businessDescription;

    @Column(length = 500)
    private String productsSupplied; // Comma-separated categories

    @Column
    private Integer yearsInBusiness;

    // Verification Status
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SupplierStatus status = SupplierStatus.PENDING;

    // Admin Review
    @Column(length = 1000)
    private String adminRemarks;

    @Column
    private Long reviewedBy; // Admin user ID who reviewed

    @Column
    private LocalDateTime reviewedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requested_by")
    private User requestedBy; // User who added/requested the supplier

    @Column(length = 1000)
    private String rejectionReason;

    // Audit Fields
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column
    private LocalDateTime updatedAt;

    @Column
    private LocalDateTime approvedAt;

    // Rating and Performance
    @Column
    private Double rating = 0.0; // Average rating (0-5)

    @Column
    private Integer totalOrders = 0;

    @Column
    private Boolean isActive = true;

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // Helper methods
    public boolean isVerified() {
        return this.status == SupplierStatus.APPROVED;
    }

    public boolean isPending() {
        return this.status == SupplierStatus.PENDING;
    }

    public boolean isRejected() {
        return this.status == SupplierStatus.REJECTED;
    }
}
