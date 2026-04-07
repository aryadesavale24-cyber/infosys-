package com.inventra.inventory.controller;

import com.inventra.inventory.dto.StockTransactionDTO;
import com.inventra.inventory.model.TransactionType;
import com.inventra.inventory.service.StockTransactionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/stock")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class StockTransactionController {

    private final StockTransactionService stockTransactionService;

    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @PostMapping("/in")
    public ResponseEntity<StockTransactionDTO> stockIn(@Valid @RequestBody StockTransactionDTO transactionDTO) {
        StockTransactionDTO transaction = stockTransactionService.stockIn(transactionDTO);
        return new ResponseEntity<>(transaction, HttpStatus.CREATED);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STAFF')")
    @PostMapping("/out")
    public ResponseEntity<StockTransactionDTO> stockOut(@Valid @RequestBody StockTransactionDTO transactionDTO) {
        StockTransactionDTO transaction = stockTransactionService.stockOut(transactionDTO);
        return new ResponseEntity<>(transaction, HttpStatus.CREATED);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @PostMapping("/adjust")
    public ResponseEntity<StockTransactionDTO> adjustStock(@Valid @RequestBody StockTransactionDTO transactionDTO) {
        StockTransactionDTO transaction = stockTransactionService.adjustStock(transactionDTO);
        return new ResponseEntity<>(transaction, HttpStatus.CREATED);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STAFF')")
    @GetMapping("/transactions/{productId}")
    public ResponseEntity<Page<StockTransactionDTO>> getProductTransactions(
            @PathVariable Long productId,
            Pageable pageable) {
        Page<StockTransactionDTO> transactions = stockTransactionService.getProductTransactions(productId, pageable);
        return ResponseEntity.ok(transactions);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @GetMapping("/transactions")
    public ResponseEntity<Page<StockTransactionDTO>> getAllTransactions(Pageable pageable) {
        Page<StockTransactionDTO> transactions = stockTransactionService.getAllTransactions(pageable);
        return ResponseEntity.ok(transactions);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @GetMapping("/transactions/type/{type}")
    public ResponseEntity<Page<StockTransactionDTO>> getTransactionsByType(
            @PathVariable TransactionType type,
            Pageable pageable) {
        Page<StockTransactionDTO> transactions = stockTransactionService.getTransactionsByType(type, pageable);
        return ResponseEntity.ok(transactions);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @GetMapping("/transactions/date-range")
    public ResponseEntity<List<StockTransactionDTO>> getTransactionsByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        List<StockTransactionDTO> transactions = stockTransactionService.getTransactionsByDateRange(startDate, endDate);
        return ResponseEntity.ok(transactions);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @GetMapping("/reconcile/{productId}")
    public ResponseEntity<Boolean> reconcileProductStock(@PathVariable Long productId) {
        boolean isReconciled = stockTransactionService.reconcileProductStock(productId);
        return ResponseEntity.ok(isReconciled);
    }

    /**
     * Manager-scoped: returns all stock transactions for products
     * in the current manager's assigned categories only.
     * ADMIN gets ALL transactions from this endpoint too.
     */
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @GetMapping("/transactions/my-categories")
    public ResponseEntity<List<StockTransactionDTO>> getTransactionsForMyCategories() {
        return ResponseEntity.ok(stockTransactionService.getTransactionsForMyCategories());
    }

    /**
     * Staff-scoped: returns all stock transactions performed by current staff
     */
    @PreAuthorize("hasRole('STAFF')")
    @GetMapping("/transactions/me")
    public ResponseEntity<Page<StockTransactionDTO>> getMyTransactions(Pageable pageable) {
        return ResponseEntity.ok(stockTransactionService.getMyTransactions(pageable));
    }
}
