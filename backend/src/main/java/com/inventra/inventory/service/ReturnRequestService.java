package com.inventra.inventory.service;

import com.inventra.inventory.dto.ReturnRequestDTO;
import com.inventra.inventory.dto.StockTransactionDTO;
import com.inventra.inventory.exception.ResourceNotFoundException;
import com.inventra.inventory.model.*;
import com.inventra.inventory.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service managing the full customer return workflow.
 *
 * Flow:
 * 1. Staff raises a ReturnRequest (PENDING)
 * 2. Manager reviews → decides one of three outcomes:
 * APPROVED_RESTOCK — item is good → calls stockIn(RETURN)
 * APPROVED_DAMAGE — item defective → DAMAGE audit record (no restock)
 * REJECTED — return refused → no stock change
 *
 * Security rules (same as StockOutApprovalService):
 * - Staff can only raise returns for products in their assigned categories
 * - Manager can only approve returns for their assigned categories
 * - Only the assigned manager can act on a request
 * - Once resolved, status is final (idempotency guard)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ReturnRequestService {

    private final ReturnRequestRepository returnRepo;
    private final ProductRepository productRepo;
    private final UserRepository userRepo;
    private final StaffCategoryAssignmentRepository staffCatRepo;
    private final ManagerCategoryAssignmentRepository managerCatRepo;
    private final StockTransactionService stockTransactionService;
    private final RealtimeEventService realtimeEventService;

    // ─────────────────────────────────────────────────────────────────────────
    // STAFF: Raise a return request
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Staff receives a returned item from a customer and raises a return request
     * for Manager review. No stock is changed at this stage.
     */
    @Transactional
    public ReturnRequestDTO raiseReturnRequest(Long productId,
            Integer quantity,
            ReturnReason returnReason,
            ItemCondition itemCondition,
            Long managerId,
            String originalSaleRef,
            String customerName,
            String staffNotes) {
        User currentUser = getCurrentUser();
        log.info("ReturnRequest raised by {} for product ID: {}, qty: {}",
                currentUser.getUsername(), productId, quantity);

        // ── Fetch & validate product ──────────────────────────────────────────
        Product product = productRepo.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + productId));

        if (product.getIsDeleted()) {
            throw new ResourceNotFoundException("Product not found: " + productId);
        }

        // ── Validate quantity ─────────────────────────────────────────────────
        if (quantity == null || quantity <= 0) {
            throw new IllegalArgumentException("Return quantity must be at least 1");
        }

        // ── Fetch manager ─────────────────────────────────────────────────────
        User manager = userRepo.findById(managerId)
                .orElseThrow(() -> new ResourceNotFoundException("Manager not found: " + managerId));

        if (manager.getRole() != Role.MANAGER) {
            throw new IllegalArgumentException("Selected approver must be a MANAGER");
        }

        // ── Category scope check for STAFF ────────────────────────────────────
        // Staff can only raise returns for products in their assigned categories
        if (currentUser.getRole() == Role.STAFF) {
            List<Long> staffCategoryIds = staffCatRepo.findCategoryIdsByStaffId(currentUser.getId());
            if (product.getCategory() == null ||
                    !staffCategoryIds.contains(product.getCategory().getId())) {
                throw new IllegalArgumentException(
                        "You are not assigned to this product's category. " +
                                "You can only process returns for products in your assigned categories.");
            }
        }

        // ── Manager must be assigned to this product's category ───────────────
        if (product.getCategory() != null) {
            List<Long> managerCategoryIds = managerCatRepo.findCategoryIdsByManagerId(managerId);
            if (!managerCategoryIds.contains(product.getCategory().getId())) {
                throw new IllegalArgumentException(
                        "The selected manager is not assigned to this product's category.");
            }
        }

        // ── Build and save the return request ─────────────────────────────────
        ReturnRequest request = new ReturnRequest();
        request.setProduct(product);
        request.setQuantity(quantity);
        request.setReturnReason(returnReason);
        request.setItemCondition(itemCondition);
        request.setOriginalSaleRef(originalSaleRef);
        request.setCustomerName(customerName);
        request.setStaffNotes(staffNotes);
        request.setStaff(currentUser);
        request.setManager(manager);
        request.setStatus(ReturnStatus.PENDING);

        ReturnRequest saved = returnRepo.save(request);
        log.info("ReturnRequest #{} saved with status PENDING", saved.getId());

        // ── Real-time: manager sees the new request instantly ─────────────────
        realtimeEventService.returnUpdated("RETURN_REQUESTED", saved.getId());

        return toDTO(saved);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STAFF: View own requests
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ReturnRequestDTO> getMyRequests() {
        User me = getCurrentUser();
        return returnRepo.findByStaffIdOrderByRequestedAtDesc(me.getId())
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MANAGER: View pending requests directed at them
    // ─────────────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ReturnRequestDTO> getPendingForManager() {
        User me = getCurrentUser();
        return returnRepo.findByManagerIdAndStatusOrderByRequestedAtDesc(me.getId(), ReturnStatus.PENDING)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    /** All return requests directed at this manager (any status) — for history */
    @Transactional(readOnly = true)
    public List<ReturnRequestDTO> getAllForManager() {
        User me = getCurrentUser();
        return returnRepo.findByManagerIdOrderByRequestedAtDesc(me.getId())
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    /** All return requests for a specific product — admin/manager audit view */
    @Transactional(readOnly = true)
    public List<ReturnRequestDTO> getReturnsByProduct(Long productId) {
        return returnRepo.findByProductIdOrderByRequestedAtDesc(productId)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    /** Count of pending returns for the logged-in manager — for badge display */
    @Transactional(readOnly = true)
    public long countPendingForManager() {
        User me = getCurrentUser();
        return returnRepo.countByManagerIdAndStatus(me.getId(), ReturnStatus.PENDING);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ADMIN: Full return history across the entire system
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Admin-only: returns ALL return requests across the system, newest first.
     * Includes full supplier, pricing, and financial impact data.
     */
    @Transactional(readOnly = true)
    public List<ReturnRequestDTO> getAllReturns() {
        return returnRepo.findAllByOrderByRequestedAtDesc()
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    /** Admin: returns filtered by a specific status */
    @Transactional(readOnly = true)
    public List<ReturnRequestDTO> getReturnsByStatus(ReturnStatus status) {
        return returnRepo.findByStatusOrderByRequestedAtDesc(status)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MANAGER: APPROVE as RESTOCK (item is GOOD → put back on shelf)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Manager approves the return and decides the item is in good condition.
     * This triggers a stockIn(RETURN) transaction — stock increases.
     */
    @Transactional
    public ReturnRequestDTO approveAsRestock(Long requestId, String managerNotes) {
        User manager = getCurrentUser();
        ReturnRequest request = findAndValidate(requestId, manager);

        log.info("Manager {} approving ReturnRequest #{} as RESTOCK",
                manager.getUsername(), requestId);

        // ── Execute Stock IN using existing stockIn() — TransactionType.RETURN ─
        StockTransactionDTO txDTO = new StockTransactionDTO();
        txDTO.setProductId(request.getProduct().getId());
        txDTO.setQuantity(request.getQuantity());
        txDTO.setTransactionType(TransactionType.RETURN); // existing enum value
        txDTO.setPerformedById(request.getStaff().getId()); // original staff credited
        txDTO.setNotes("Customer return approved (RESTOCK) by " + manager.getUsername()
                + (managerNotes != null && !managerNotes.isBlank() ? ": " + managerNotes : ""));
        txDTO.setReferenceNumber(request.getOriginalSaleRef());

        // stockIn() handles: row locking, stock update, overstock alert, broadcast
        // STOCK_IN
        StockTransactionDTO savedTx = stockTransactionService.stockIn(txDTO);

        // ── Update the return request ─────────────────────────────────────────
        request.setStatus(ReturnStatus.APPROVED_RESTOCK);
        request.setManagerNotes(managerNotes);
        request.setResolvedAt(LocalDateTime.now());

        // Link the resulting transaction for full traceability
        StockTransaction txEntity = new StockTransaction();
        txEntity.setId(savedTx.getId());
        request.setStockTransaction(txEntity);

        returnRepo.save(request);
        log.info("ReturnRequest #{} resolved as APPROVED_RESTOCK. Stock increased by {}",
                requestId, request.getQuantity());

        // ── Broadcast ─────────────────────────────────────────────────────────
        realtimeEventService.returnUpdated("RETURN_APPROVED_RESTOCK", request.getId());
        // STOCK_IN event is already broadcast inside stockTransactionService.stockIn()

        return toDTO(request);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MANAGER: APPROVE as DAMAGE (item is DEFECTIVE → written off, no restock)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Manager approves the return but marks the item as defective/damaged.
     * Stock does NOT increase — the item is written off.
     * A DAMAGE transaction is recorded for audit/compliance.
     */
    @Transactional
    public ReturnRequestDTO approveAsDamage(Long requestId, String managerNotes) {
        User manager = getCurrentUser();
        ReturnRequest request = findAndValidate(requestId, manager);

        log.info("Manager {} approving ReturnRequest #{} as DAMAGE (write-off)",
                manager.getUsername(), requestId);

        // ── Create a DAMAGE audit record (quantity = 0, no real stock change) ──
        // We use stockIn with qty 0 here purely for audit trail consistency.
        // Alternatively, a direct save of StockTransaction is cleaner — we do that:
        StockTransactionDTO txDTO = new StockTransactionDTO();
        txDTO.setProductId(request.getProduct().getId());
        txDTO.setQuantity(0); // no stock change
        txDTO.setTransactionType(TransactionType.DAMAGE); // existing enum value
        txDTO.setPerformedById(request.getStaff().getId());
        txDTO.setNotes("Customer return received as DEFECTIVE — written off. Manager: "
                + manager.getUsername()
                + (managerNotes != null && !managerNotes.isBlank() ? ": " + managerNotes : ""));
        txDTO.setReferenceNumber(request.getOriginalSaleRef());
        txDTO.setReason("Defective item — return write-off");

        // Use stockIn with qty=0 just for the audit record —
        // stockIn() handles performedBy / approvedBy fields cleanly
        StockTransactionDTO savedTx = stockTransactionService.stockIn(txDTO);

        // ── Update the return request ─────────────────────────────────────────
        request.setStatus(ReturnStatus.APPROVED_DAMAGE);
        request.setManagerNotes(managerNotes);
        request.setResolvedAt(LocalDateTime.now());

        StockTransaction txEntity = new StockTransaction();
        txEntity.setId(savedTx.getId());
        request.setStockTransaction(txEntity);

        returnRepo.save(request);
        log.info("ReturnRequest #{} resolved as APPROVED_DAMAGE. Item written off.", requestId);

        // ── Broadcast ─────────────────────────────────────────────────────────
        realtimeEventService.returnUpdated("RETURN_APPROVED_DAMAGE", request.getId());

        return toDTO(request);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MANAGER: REJECT (return not accepted)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Manager rejects the return request — no stock change, no transaction.
     * Staff is notified via WebSocket.
     */
    @Transactional
    public ReturnRequestDTO rejectReturn(Long requestId, String managerNotes) {
        User manager = getCurrentUser();
        ReturnRequest request = findAndValidate(requestId, manager);

        log.info("Manager {} rejecting ReturnRequest #{}", manager.getUsername(), requestId);

        request.setStatus(ReturnStatus.REJECTED);
        request.setManagerNotes(managerNotes);
        request.setResolvedAt(LocalDateTime.now());
        // stockTransaction stays null — no transaction was created
        returnRepo.save(request);

        log.info("ReturnRequest #{} REJECTED. No stock change.", requestId);

        // ── Broadcast — staff sees rejection instantly ─────────────────────────
        realtimeEventService.returnUpdated("RETURN_REJECTED", request.getId());

        return toDTO(request);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Shared guard used before any Manager action.
     * Validates: request exists, caller is the assigned manager, status is PENDING.
     */
    private ReturnRequest findAndValidate(Long requestId, User manager) {
        ReturnRequest request = returnRepo.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Return request not found: " + requestId));

        if (!request.getManager().getId().equals(manager.getId())) {
            throw new IllegalArgumentException(
                    "You are not the assigned approver for this return request.");
        }

        if (request.getStatus() != ReturnStatus.PENDING) {
            throw new IllegalArgumentException(
                    "This return request is already " + request.getStatus() +
                            " and cannot be modified.");
        }
        return request;
    }

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepo.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));
    }

    /** Map entity → DTO — includes supplier + financial data for admin view */
    private ReturnRequestDTO toDTO(ReturnRequest r) {
        ReturnRequestDTO dto = new ReturnRequestDTO();
        dto.setId(r.getId());

        // product
        dto.setProductId(r.getProduct().getId());
        dto.setProductName(r.getProduct().getName());
        dto.setProductSku(r.getProduct().getSku());
        dto.setCategoryName(r.getProduct().getCategory() != null
                ? r.getProduct().getCategory().getName()
                : null);

        // ── Supplier (may be null if no supplier linked to product) ────────────
        if (r.getProduct().getSupplier() != null) {
            dto.setSupplierId(r.getProduct().getSupplier().getId());
            dto.setSupplierName(r.getProduct().getSupplier().getCompanyName());
            dto.setSupplierEmail(r.getProduct().getSupplier().getEmail());
        }

        // ── Product pricing ────────────────────────────────────────────────────
        dto.setProductCostPrice(r.getProduct().getCostPrice());
        dto.setProductSellingPrice(r.getProduct().getSellingPrice());

        // ── Estimated loss ─────────────────────────────────────────────────────
        // APPROVED_DAMAGE → quantity × costPrice (item written off)
        // APPROVED_RESTOCK → 0 (item back in stock, no loss)
        // PENDING/REJECTED → null / 0
        if (r.getStatus() == ReturnStatus.APPROVED_DAMAGE && r.getProduct().getCostPrice() != null) {
            dto.setEstimatedLoss(
                    r.getProduct().getCostPrice().multiply(new BigDecimal(r.getQuantity())));
        } else if (r.getStatus() == ReturnStatus.APPROVED_RESTOCK
                || r.getStatus() == ReturnStatus.REJECTED) {
            dto.setEstimatedLoss(BigDecimal.ZERO);
        }
        // PENDING stays null — not yet decided

        // return details
        dto.setQuantity(r.getQuantity());
        dto.setReturnReason(r.getReturnReason());
        dto.setItemCondition(r.getItemCondition());
        dto.setOriginalSaleRef(r.getOriginalSaleRef());
        dto.setCustomerName(r.getCustomerName());

        // notes
        dto.setStaffNotes(r.getStaffNotes());
        dto.setManagerNotes(r.getManagerNotes());

        // staff
        dto.setStaffId(r.getStaff().getId());
        dto.setStaffUsername(r.getStaff().getUsername());
        dto.setStaffFullName(r.getStaff().getFullName());

        // manager
        dto.setManagerId(r.getManager().getId());
        dto.setManagerUsername(r.getManager().getUsername());
        dto.setManagerFullName(r.getManager().getFullName());

        // status & transaction link
        dto.setStatus(r.getStatus());
        if (r.getStockTransaction() != null) {
            dto.setStockTransactionId(r.getStockTransaction().getId());
        }

        // timestamps
        dto.setRequestedAt(r.getRequestedAt());
        dto.setResolvedAt(r.getResolvedAt());

        return dto;
    }
}
