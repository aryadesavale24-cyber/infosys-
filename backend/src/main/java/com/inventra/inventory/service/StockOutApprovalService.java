package com.inventra.inventory.service;

import com.inventra.inventory.exception.ResourceNotFoundException;
import com.inventra.inventory.model.*;
import com.inventra.inventory.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StockOutApprovalService {

    /** Quantity limit below which staff can directly stock-out without approval */
    public static final int DIRECT_LIMIT = 10;

    /** A manager is considered "online" if active within this many minutes */
    private static final int ONLINE_MINUTES = 10;

    private final StockOutApprovalRequestRepository approvalRepo;
    private final ProductRepository productRepo;
    private final UserRepository userRepo;
    private final ManagerCategoryAssignmentRepository managerCatRepo;
    private final StockTransactionService stockTransactionService;
    private final RealtimeEventService realtimeEventService;

    // ────────────────────────────────────────────────────────────────────────
    // STAFF: raise a request
    // ────────────────────────────────────────────────────────────────────────

    @Transactional
    public Map<String, Object> requestApproval(Long productId,
            Integer quantity,
            Long managerId,
            String notes,
            String referenceNumber) {
        User staff = getCurrentUser();
        User manager = userRepo.findById(managerId)
                .orElseThrow(() -> new ResourceNotFoundException("Manager not found: " + managerId));
        Product product = productRepo.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + productId));

        if (manager.getRole() != Role.MANAGER) {
            throw new IllegalArgumentException("Selected user is not a manager.");
        }
        if (quantity <= DIRECT_LIMIT) {
            throw new IllegalArgumentException(
                    "Quantity " + quantity + " is within the direct-sale limit of " + DIRECT_LIMIT +
                            ". No approval needed.");
        }
        if (product.getCurrentStock() < quantity) {
            throw new IllegalArgumentException(
                    "Insufficient stock. Available: " + product.getCurrentStock());
        }

        StockOutApprovalRequest req = new StockOutApprovalRequest();
        req.setProduct(product);
        req.setQuantity(quantity);
        req.setNotes(notes);
        req.setReferenceNumber(referenceNumber);
        req.setStaff(staff);
        req.setManager(manager);
        req.setStatus(ApprovalStatus.PENDING);
        approvalRepo.save(req);

        // Broadcast real-time event so manager sees request instantly
        realtimeEventService.approvalUpdated("REQUESTED", req.getId());

        return toMap(req);
    }

    // ────────────────────────────────────────────────────────────────────────
    // STAFF: see own requests
    // ────────────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getMyRequests() {
        User me = getCurrentUser();
        return approvalRepo.findByStaffIdOrderByRequestedAtDesc(me.getId())
                .stream().map(this::toMap).collect(Collectors.toList());
    }

    // ────────────────────────────────────────────────────────────────────────
    // STAFF: online managers for a product's category
    // ────────────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getOnlineManagersForProduct(Long productId) {
        Product product = productRepo.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + productId));

        if (product.getCategory() == null)
            return List.of();

        Long categoryId = product.getCategory().getId();
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(ONLINE_MINUTES);

        return managerCatRepo.findByCategoryIdAndIsActiveTrue(categoryId).stream()
                .map(ManagerCategoryAssignment::getManager)
                .distinct()
                .map(m -> {
                    boolean isOnline = m.getLastActiveAt() != null && m.getLastActiveAt().isAfter(cutoff);
                    Map<String, Object> r = new HashMap<>();
                    r.put("id", m.getId());
                    r.put("username", m.getUsername());
                    r.put("fullName", m.getFullName());
                    r.put("lastActiveAt", m.getLastActiveAt());
                    r.put("isOnline", isOnline);
                    return r;
                })
                .collect(Collectors.toList());
    }

    // ────────────────────────────────────────────────────────────────────────
    // MANAGER: see pending requests directed at them
    // ────────────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getPendingForManager() {
        User me = getCurrentUser();
        return approvalRepo
                .findByManagerIdAndStatusOrderByRequestedAtDesc(me.getId(), ApprovalStatus.PENDING)
                .stream().map(this::toMap).collect(Collectors.toList());
    }

    /** All requests directed at the manager (any status) — for history view */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAllForManager() {
        User me = getCurrentUser();
        return approvalRepo.findByManagerIdOrderByRequestedAtDesc(me.getId())
                .stream().map(this::toMap).collect(Collectors.toList());
    }

    // ────────────────────────────────────────────────────────────────────────
    // MANAGER: approve
    // ────────────────────────────────────────────────────────────────────────

    @Transactional
    public Map<String, Object> approve(Long requestId, String managerNote) {
        User manager = getCurrentUser();
        StockOutApprovalRequest req = findAndValidate(requestId, manager);

        req.setStatus(ApprovalStatus.APPROVED);
        req.setManagerNote(managerNote);
        req.setResolvedAt(LocalDateTime.now());
        approvalRepo.save(req);

        // Actually execute the stock-out now that it's approved
        com.inventra.inventory.dto.StockTransactionDTO dto = new com.inventra.inventory.dto.StockTransactionDTO();
        dto.setProductId(req.getProduct().getId());
        dto.setQuantity(req.getQuantity());
        dto.setTransactionType(TransactionType.SALE);
        dto.setPerformedById(req.getStaff().getId());
        dto.setNotes("Approved by " + manager.getUsername() +
                (managerNote != null && !managerNote.isBlank() ? ": " + managerNote : ""));
        dto.setReferenceNumber(req.getReferenceNumber());
        stockTransactionService.stockOut(dto);

        // Broadcast — both manager (approval list) and staff (my requests) pages
        // refresh
        realtimeEventService.approvalUpdated("APPROVED", req.getId());
        realtimeEventService.stockUpdated("STOCK_OUT", req.getProduct().getId());

        return toMap(req);
    }

    // ────────────────────────────────────────────────────────────────────────
    // MANAGER: reject
    // ────────────────────────────────────────────────────────────────────────

    @Transactional
    public Map<String, Object> reject(Long requestId, String managerNote) {
        User manager = getCurrentUser();
        StockOutApprovalRequest req = findAndValidate(requestId, manager);

        req.setStatus(ApprovalStatus.REJECTED);
        req.setManagerNote(managerNote);
        req.setResolvedAt(LocalDateTime.now());
        approvalRepo.save(req);

        realtimeEventService.approvalUpdated("REJECTED", req.getId());

        return toMap(req);
    }

    // ────────────────────────────────────────────────────────────────────────
    // Helpers
    // ────────────────────────────────────────────────────────────────────────

    private StockOutApprovalRequest findAndValidate(Long requestId, User manager) {
        StockOutApprovalRequest req = approvalRepo.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Approval request not found: " + requestId));
        if (!req.getManager().getId().equals(manager.getId())) {
            throw new IllegalArgumentException("You are not the assigned approver for this request.");
        }
        if (req.getStatus() != ApprovalStatus.PENDING) {
            throw new IllegalArgumentException("This request is already " + req.getStatus());
        }
        return req;
    }

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepo.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));
    }

    private Map<String, Object> toMap(StockOutApprovalRequest r) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", r.getId());
        m.put("productId", r.getProduct().getId());
        m.put("productName", r.getProduct().getName());
        m.put("productSku", r.getProduct().getSku());
        m.put("categoryName", r.getProduct().getCategory() != null ? r.getProduct().getCategory().getName() : null);
        m.put("quantity", r.getQuantity());
        m.put("notes", r.getNotes());
        m.put("referenceNumber", r.getReferenceNumber());
        m.put("staffId", r.getStaff().getId());
        m.put("staffUsername", r.getStaff().getUsername());
        m.put("staffFullName", r.getStaff().getFullName());
        m.put("managerId", r.getManager().getId());
        m.put("managerUsername", r.getManager().getUsername());
        m.put("managerFullName", r.getManager().getFullName());
        m.put("status", r.getStatus().name());
        m.put("managerNote", r.getManagerNote());
        m.put("requestedAt", r.getRequestedAt());
        m.put("resolvedAt", r.getResolvedAt());
        return m;
    }
}
