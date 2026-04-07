export interface Supplier {
    id: number;
    companyName: string;
    contactPersonName: string;
    email: string;
    phoneNumber: string;
    alternatePhone?: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
    gstNumber: string;
    gstCertificatePath?: string;
    tradeLicenseNumber: string;
    tradeLicensePath?: string;
    panNumber?: string;
    panCardPath?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    accountHolderName?: string;
    businessDescription?: string;
    productsSupplied?: string;
    yearsInBusiness?: number;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
    adminRemarks?: string;
    rejectionReason?: string;
    createdAt: string;
    approvedAt?: string;
    reviewedAt?: string;
    rating: number;
    totalOrders: number;
    isActive: boolean;
    reviewedByUsername?: string;
    requestedById?: number;
    requestedByUsername?: string;
    requestedByFullName?: string;
}

export interface SupplierStats {
    pending: number;
    approved: number;
    rejected: number;
    suspended: number;
}
