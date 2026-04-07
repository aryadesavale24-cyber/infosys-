package com.inventra.inventory.service;

import com.inventra.inventory.dto.StockTransactionDTO;
import com.inventra.inventory.exception.InsufficientStockException;
import com.inventra.inventory.exception.ResourceNotFoundException;
import com.inventra.inventory.model.*;
import com.inventra.inventory.repository.ProductRepository;
import com.inventra.inventory.repository.StockTransactionRepository;
import com.inventra.inventory.repository.UserRepository;
import com.inventra.inventory.repository.ManagerCategoryAssignmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class StockTransactionService {

    private final StockTransactionRepository stockTransactionRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final StockAlertService stockAlertService;
    private final ManagerCategoryAssignmentRepository managerCatRepo;
    private final RealtimeEventService realtimeEventService;

    /**
     * Stock IN operation (Purchase, Return, Adjustment)
     * Uses SERIALIZABLE isolation to prevent concurrency issues
     */
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public StockTransactionDTO stockIn(StockTransactionDTO transactionDTO) {
        log.info("Processing STOCK IN for product ID: {}, quantity: {}",
                transactionDTO.getProductId(), transactionDTO.getQuantity());

        // Validate transaction type
        if (!isStockInType(transactionDTO.getTransactionType())) {
            throw new IllegalArgumentException(
                    "Invalid transaction type for stock in: " + transactionDTO.getTransactionType());
        }

        // Lock the product row to prevent concurrent modifications
        Product product = productRepository.findByIdWithLock(transactionDTO.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Product not found with ID: " + transactionDTO.getProductId()));

        if (product.getIsDeleted()) {
            throw new ResourceNotFoundException("Product not found with ID: " + transactionDTO.getProductId());
        }

        int currentStock = product.getCurrentStock();
        int newStock = currentStock + transactionDTO.getQuantity();

        // Create transaction record
        StockTransaction transaction = new StockTransaction();
        transaction.setProduct(product);
        transaction.setTransactionType(transactionDTO.getTransactionType());
        transaction.setQuantityChange(transactionDTO.getQuantity()); // Positive for IN
        transaction.setStockBefore(currentStock);
        transaction.setStockAfter(newStock);
        transaction.setReferenceNumber(transactionDTO.getReferenceNumber());
        transaction.setSupplierId(transactionDTO.getSupplierId());
        transaction.setWarehouseId(transactionDTO.getWarehouseId());
        transaction.setUnitPrice(transactionDTO.getUnitPrice());
        transaction.setNotes(transactionDTO.getNotes());
        transaction.setReason(transactionDTO.getReason());
        // If performedById is set (return / approval flow), credit that user;
        // otherwise fall back to the currently authenticated user.
        if (transactionDTO.getPerformedById() != null) {
            transaction.setPerformedBy(userRepository.findById(transactionDTO.getPerformedById())
                    .orElseThrow(() -> new ResourceNotFoundException("User not found")));
            transaction.setApprovedBy(getCurrentUser()); // caller is the approver
        } else {
            transaction.setPerformedBy(getCurrentUser());
        }

        // Calculate total amount
        if (transactionDTO.getUnitPrice() != null) {
            BigDecimal totalAmount = transactionDTO.getUnitPrice()
                    .multiply(new BigDecimal(transactionDTO.getQuantity()));
            transaction.setTotalAmount(totalAmount);
        }

        StockTransaction savedTransaction = stockTransactionRepository.save(transaction);

        // Only update physical stock when quantity > 0.
        // qty == 0 is used exclusively for DAMAGE audit records (defective return
        // write-off)
        // where we want an audit trail but no physical stock movement.
        if (transactionDTO.getQuantity() > 0) {
            product.setCurrentStock(newStock);
            productRepository.save(product);

            log.info("STOCK IN completed. Product ID: {}, Old Stock: {}, New Stock: {}",
                    product.getId(), currentStock, newStock);

            // Check and resolve low stock alerts
            stockAlertService.checkAndResolveLowStockAlert(product);

            // Check for overstock
            stockAlertService.checkAndCreateOverstockAlert(product);

            // Broadcast real-time stock event
            realtimeEventService.stockUpdated("STOCK_IN", product.getId());
        } else {
            log.info("STOCK IN (audit only, qty=0) saved for product ID: {}. No stock change.", product.getId());
        }

        return convertToDTO(savedTransaction);
    }

    /**
     * Stock OUT operation (Sale, Damage, Adjustment)
     * Uses SERIALIZABLE isolation to prevent negative stock
     */
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public StockTransactionDTO stockOut(StockTransactionDTO transactionDTO) {
        log.info("Processing STOCK OUT for product ID: {}, quantity: {}",
                transactionDTO.getProductId(), transactionDTO.getQuantity());

        // Validate transaction type
        if (!isStockOutType(transactionDTO.getTransactionType())) {
            throw new IllegalArgumentException(
                    "Invalid transaction type for stock out: " + transactionDTO.getTransactionType());
        }

        // Lock the product row to prevent concurrent modifications
        Product product = productRepository.findByIdWithLock(transactionDTO.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Product not found with ID: " + transactionDTO.getProductId()));

        if (product.getIsDeleted()) {
            throw new ResourceNotFoundException("Product not found with ID: " + transactionDTO.getProductId());
        }

        // Check if product is active for sales
        if (transactionDTO.getTransactionType() == TransactionType.SALE &&
                product.getStatus() != ProductStatus.ACTIVE) {
            throw new IllegalArgumentException("Cannot sell inactive or discontinued product");
        }

        int currentStock = product.getCurrentStock();
        int requestedQuantity = transactionDTO.getQuantity();

        // Validate sufficient stock
        if (currentStock < requestedQuantity) {
            log.error("Insufficient stock. Product ID: {}, Available: {}, Requested: {}",
                    product.getId(), currentStock, requestedQuantity);
            throw new InsufficientStockException(
                    String.format("Insufficient stock for product '%s'. Available: %d, Requested: %d",
                            product.getName(), currentStock, requestedQuantity));
        }

        int newStock = currentStock - requestedQuantity;

        // Create transaction record
        StockTransaction transaction = new StockTransaction();
        transaction.setProduct(product);
        transaction.setTransactionType(transactionDTO.getTransactionType());
        transaction.setQuantityChange(-requestedQuantity); // Negative for OUT
        transaction.setStockBefore(currentStock);
        transaction.setStockAfter(newStock);
        transaction.setReferenceNumber(transactionDTO.getReferenceNumber());
        transaction.setCustomerId(transactionDTO.getCustomerId());
        transaction.setWarehouseId(transactionDTO.getWarehouseId());
        transaction.setUnitPrice(transactionDTO.getUnitPrice());
        transaction.setNotes(transactionDTO.getNotes());
        transaction.setReason(transactionDTO.getReason());
        if (transactionDTO.getPerformedById() != null) {
            transaction.setPerformedBy(userRepository.findById(transactionDTO.getPerformedById())
                    .orElseThrow(() -> new ResourceNotFoundException("User not found")));
            transaction.setApprovedBy(getCurrentUser()); // Manager who approved it
        } else {
            transaction.setPerformedBy(getCurrentUser());
        }

        // Calculate total amount (use selling price if not provided)
        BigDecimal unitPrice = transactionDTO.getUnitPrice() != null ? transactionDTO.getUnitPrice()
                : product.getSellingPrice();
        BigDecimal totalAmount = unitPrice.multiply(new BigDecimal(requestedQuantity));
        transaction.setTotalAmount(totalAmount);

        StockTransaction savedTransaction = stockTransactionRepository.save(transaction);

        // Update product stock
        product.setCurrentStock(newStock);
        productRepository.save(product);

        log.info("STOCK OUT completed. Product ID: {}, Old Stock: {}, New Stock: {}",
                product.getId(), currentStock, newStock);

        // Check and create low stock or out of stock alerts
        stockAlertService.checkAndCreateLowStockAlert(product);

        // Broadcast real-time stock event
        realtimeEventService.stockUpdated("STOCK_OUT", product.getId());

        return convertToDTO(savedTransaction);
    }

    /**
     * Stock adjustment (can be positive or negative)
     */
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public StockTransactionDTO adjustStock(StockTransactionDTO transactionDTO) {
        log.info("Processing STOCK ADJUSTMENT for product ID: {}, quantity: {}",
                transactionDTO.getProductId(), transactionDTO.getQuantity());

        transactionDTO.setTransactionType(TransactionType.ADJUSTMENT);

        // Determine if it's an increase or decrease
        boolean isIncrease = transactionDTO.getQuantity() > 0;

        if (isIncrease) {
            return stockIn(transactionDTO);
        } else {
            // Convert to positive for stockOut
            transactionDTO.setQuantity(Math.abs(transactionDTO.getQuantity()));
            return stockOut(transactionDTO);
        }
    }

    /**
     * Get transaction history for a product
     */
    @Transactional(readOnly = true)
    public Page<StockTransactionDTO> getProductTransactions(Long productId, Pageable pageable) {
        return stockTransactionRepository.findByProductId(productId, pageable)
                .map(this::convertToDTO);
    }

    /**
     * Get all transactions (for admin/manager)
     */
    @Transactional(readOnly = true)
    public Page<StockTransactionDTO> getAllTransactions(Pageable pageable) {
        return stockTransactionRepository.findRecentTransactions(pageable)
                .map(this::convertToDTO);
    }

    /**
     * Get transactions by type
     */
    @Transactional(readOnly = true)
    public Page<StockTransactionDTO> getTransactionsByType(TransactionType type, Pageable pageable) {
        return stockTransactionRepository.findByTransactionType(type, pageable)
                .map(this::convertToDTO);
    }

    /**
     * Get transactions by date range
     */
    @Transactional(readOnly = true)
    public List<StockTransactionDTO> getTransactionsByDateRange(LocalDateTime startDate, LocalDateTime endDate) {
        return stockTransactionRepository.findByDateRange(startDate, endDate).stream()
                .map(this::convertToDTO)
                .toList();
    }

    /**
     * Get transactions scoped to the current user's role:
     * - ADMIN → ALL transactions (no category filter)
     * - MANAGER → only transactions for their assigned categories
     */
    @Transactional(readOnly = true)
    public List<StockTransactionDTO> getTransactionsForMyCategories() {
        User me = getCurrentUser();

        // ADMIN sees everything
        if (me.getRole() == Role.ADMIN) {
            return stockTransactionRepository
                    .findRecentTransactions(org.springframework.data.domain.Pageable.unpaged())
                    .stream()
                    .map(this::convertToDTO)
                    .toList();
        }

        // MANAGER sees only their category transactions
        List<Long> catIds = managerCatRepo.findCategoryIdsByManagerId(me.getId());
        if (catIds.isEmpty())
            return List.of();
        return stockTransactionRepository.findByCategoryIds(catIds).stream()
                .map(this::convertToDTO)
                .toList();
    }

    /**
     * Get transactions performed by current staff
     */
    @Transactional(readOnly = true)
    public Page<StockTransactionDTO> getMyTransactions(Pageable pageable) {
        User me = getCurrentUser();
        return stockTransactionRepository.findByPerformedById(me.getId(), pageable)
                .map(this::convertToDTO);
    }

    /**
     * Reconcile product stock (verify current stock matches transaction history)
     */
    @Transactional(readOnly = true)
    public boolean reconcileProductStock(Long productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + productId));

        Integer calculatedStock = stockTransactionRepository.calculateTotalStockForProduct(productId);

        if (calculatedStock == null) {
            calculatedStock = 0;
        }

        boolean isReconciled = product.getCurrentStock().equals(calculatedStock);

        if (!isReconciled) {
            log.warn("Stock reconciliation failed for product ID: {}. Current: {}, Calculated: {}",
                    productId, product.getCurrentStock(), calculatedStock);
        }

        return isReconciled;
    }

    /**
     * Check if transaction type is stock in.
     * DAMAGE is included here because approveAsDamage() uses stockIn(qty=0)
     * purely to create an audit/write-off record — no actual stock change occurs
     * (the qty==0 guard in stockIn() ensures stock is never modified).
     */
    private boolean isStockInType(TransactionType type) {
        return type == TransactionType.PURCHASE ||
                type == TransactionType.RETURN ||
                type == TransactionType.ADJUSTMENT ||
                type == TransactionType.DAMAGE; // qty=0 damage audit record
    }

    /**
     * Check if transaction type is stock out
     */
    private boolean isStockOutType(TransactionType type) {
        return type == TransactionType.SALE ||
                type == TransactionType.DAMAGE ||
                type == TransactionType.ADJUSTMENT;
    }

    /**
     * Get current authenticated user
     */
    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));
    }

    /**
     * Convert StockTransaction entity to DTO
     */
    private StockTransactionDTO convertToDTO(StockTransaction transaction) {
        StockTransactionDTO dto = new StockTransactionDTO();
        dto.setId(transaction.getId());
        dto.setProductId(transaction.getProduct().getId());
        dto.setProductName(transaction.getProduct().getName());
        dto.setProductSku(transaction.getProduct().getSku());
        dto.setTransactionType(transaction.getTransactionType());
        dto.setQuantity(Math.abs(transaction.getQuantityChange())); // Return absolute value
        dto.setStockBefore(transaction.getStockBefore());
        dto.setStockAfter(transaction.getStockAfter());
        dto.setReferenceNumber(transaction.getReferenceNumber());
        dto.setSupplierId(transaction.getSupplierId());
        dto.setCustomerId(transaction.getCustomerId());
        dto.setWarehouseId(transaction.getWarehouseId());
        dto.setUnitPrice(transaction.getUnitPrice());
        dto.setTotalAmount(transaction.getTotalAmount());
        dto.setNotes(transaction.getNotes());
        dto.setReason(transaction.getReason());
        dto.setTransactionDate(transaction.getTransactionDate());
        dto.setPerformedByUsername(transaction.getPerformedBy().getUsername());
        dto.setPerformedByFullName(transaction.getPerformedBy().getFullName());

        // Category name for the Reports page
        if (transaction.getProduct().getCategory() != null) {
            dto.setCategoryName(transaction.getProduct().getCategory().getName());
        }

        if (transaction.getApprovedBy() != null) {
            dto.setApprovedByUsername(transaction.getApprovedBy().getUsername());
        }

        return dto;
    }
}
