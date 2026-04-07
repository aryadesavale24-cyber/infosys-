package com.inventra.inventory.service;

import com.inventra.inventory.dto.ProductDTO;
import com.inventra.inventory.exception.ResourceNotFoundException;
import com.inventra.inventory.exception.DuplicateResourceException;
import com.inventra.inventory.model.*;
import com.inventra.inventory.repository.CategoryRepository;
import com.inventra.inventory.repository.ProductRepository;
import com.inventra.inventory.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final StockAlertService stockAlertService;
    private final com.inventra.inventory.repository.ManagerCategoryAssignmentRepository managerCatRepo;
    private final RealtimeEventService realtimeEventService;

    /**
     * Create a new product
     */
    @Transactional
    public ProductDTO createProduct(ProductDTO productDTO) {
        log.info("Creating new product with SKU: {}", productDTO.getSku());

        // Validate SKU uniqueness
        if (productRepository.existsBySku(productDTO.getSku())) {
            throw new DuplicateResourceException("Product with SKU " + productDTO.getSku() + " already exists");
        }

        // Validate barcode uniqueness if provided
        if (productDTO.getBarcode() != null && !productDTO.getBarcode().isEmpty()) {
            if (productRepository.existsByBarcode(productDTO.getBarcode())) {
                throw new DuplicateResourceException(
                        "Product with barcode " + productDTO.getBarcode() + " already exists");
            }
        }

        Product product = convertToEntity(productDTO);

        // Set created by
        User currentUser = getCurrentUser();

        // ── MANAGER category guard ─────────────────────────────────────────────
        // A manager may only create products inside their assigned categories.
        if (currentUser.getRole() == Role.MANAGER) {
            if (productDTO.getCategoryId() == null) {
                throw new RuntimeException(
                        "Managers must select one of their assigned categories when creating a product.");
            }
            List<Long> allowedCatIds = managerCatRepo.findCategoryIdsByManagerId(currentUser.getId());
            if (!allowedCatIds.contains(productDTO.getCategoryId())) {
                throw new RuntimeException(
                        "You are not authorised to add products to this category. " +
                                "You can only create products in your assigned categories.");
            }
        }
        // ──────────────────────────────────────────────────────────────────────

        product.setCreatedBy(currentUser);
        product.setUpdatedBy(currentUser);

        Product savedProduct = productRepository.save(product);
        log.info("Product created successfully with ID: {}", savedProduct.getId());

        // Check if initial stock is low and create alert
        stockAlertService.checkAndCreateLowStockAlert(savedProduct);

        // Broadcast real-time event
        realtimeEventService.productUpdated("CREATED", savedProduct.getId());

        return convertToDTO(savedProduct);
    }

    /**
     * Get product by ID
     */
    @Transactional(readOnly = true)
    public ProductDTO getProductById(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + id));

        if (product.getIsDeleted()) {
            throw new ResourceNotFoundException("Product not found with ID: " + id);
        }

        return convertToDTO(product);
    }

    /**
     * Get product by SKU
     */
    @Transactional(readOnly = true)
    public ProductDTO getProductBySku(String sku) {
        Product product = productRepository.findBySku(sku)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with SKU: " + sku));

        if (product.getIsDeleted()) {
            throw new ResourceNotFoundException("Product not found with SKU: " + sku);
        }

        return convertToDTO(product);
    }

    /**
     * Get product by barcode
     */
    @Transactional(readOnly = true)
    public ProductDTO getProductByBarcode(String barcode) {
        Product product = productRepository.findByBarcode(barcode)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with barcode: " + barcode));

        if (product.getIsDeleted()) {
            throw new ResourceNotFoundException("Product not found with barcode: " + barcode);
        }

        return convertToDTO(product);
    }

    /**
     * Get all products (paginated)
     */
    @Transactional(readOnly = true)
    public Page<ProductDTO> getAllProducts(Pageable pageable) {
        return productRepository.findAllActive(pageable)
                .map(this::convertToDTO);
    }

    /**
     * Search products by keyword
     */
    @Transactional(readOnly = true)
    public Page<ProductDTO> searchProducts(String keyword, Pageable pageable) {
        return productRepository.searchProducts(keyword, pageable)
                .map(this::convertToDTO);
    }

    /**
     * Get products by category
     */
    @Transactional(readOnly = true)
    public Page<ProductDTO> getProductsByCategory(Long categoryId, Pageable pageable) {
        return productRepository.findByCategoryId(categoryId, pageable)
                .map(this::convertToDTO);
    }

    /**
     * Get low stock products
     */
    @Transactional(readOnly = true)
    public List<ProductDTO> getLowStockProducts() {
        return productRepository.findLowStockProducts().stream()
                .map(this::convertToDTO)
                .toList();
    }

    /**
     * Get out of stock products
     */
    @Transactional(readOnly = true)
    public List<ProductDTO> getOutOfStockProducts() {
        return productRepository.findOutOfStockProducts().stream()
                .map(this::convertToDTO)
                .toList();
    }

    /**
     * Update product
     */
    @Transactional
    public ProductDTO updateProduct(Long id, ProductDTO productDTO) {
        log.info("Updating product with ID: {}", id);

        Product existingProduct = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + id));

        if (existingProduct.getIsDeleted()) {
            throw new ResourceNotFoundException("Product not found with ID: " + id);
        }

        // Validate SKU uniqueness if changed
        if (!existingProduct.getSku().equals(productDTO.getSku())) {
            if (productRepository.existsBySku(productDTO.getSku())) {
                throw new DuplicateResourceException("Product with SKU " + productDTO.getSku() + " already exists");
            }
        }

        // Validate barcode uniqueness if changed
        if (productDTO.getBarcode() != null && !productDTO.getBarcode().equals(existingProduct.getBarcode())) {
            if (productRepository.existsByBarcode(productDTO.getBarcode())) {
                throw new DuplicateResourceException(
                        "Product with barcode " + productDTO.getBarcode() + " already exists");
            }
        }

        // Update fields (except stock - stock is updated via transactions only)
        updateProductFields(existingProduct, productDTO);

        User currentUser = getCurrentUser();
        existingProduct.setUpdatedBy(currentUser);

        Product updatedProduct = productRepository.save(existingProduct);
        log.info("Product updated successfully with ID: {}", updatedProduct.getId());

        realtimeEventService.productUpdated("UPDATED", updatedProduct.getId());

        return convertToDTO(updatedProduct);
    }

    /**
     * Change product status
     */
    @Transactional
    public ProductDTO changeProductStatus(Long id, ProductStatus newStatus) {
        log.info("Changing product status for ID: {} to {}", id, newStatus);

        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + id));

        product.setStatus(newStatus);
        product.setUpdatedBy(getCurrentUser());

        Product updatedProduct = productRepository.save(product);
        log.info("Product status changed successfully");

        return convertToDTO(updatedProduct);
    }

    /**
     * Soft delete product
     */
    @Transactional
    public void deleteProduct(Long id) {
        log.info("Soft deleting product with ID: {}", id);

        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + id));

        product.setIsDeleted(true);
        product.setDeletedAt(java.time.LocalDateTime.now());
        product.setDeletedBy(getCurrentUser());
        product.setStatus(ProductStatus.DISCONTINUED);

        productRepository.save(product);
        log.info("Product soft deleted successfully");

        realtimeEventService.productUpdated("DELETED", product.getId());
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
     * Convert Product entity to DTO
     */
    private ProductDTO convertToDTO(Product product) {
        ProductDTO dto = new ProductDTO();
        dto.setId(product.getId());
        dto.setSku(product.getSku());
        dto.setBarcode(product.getBarcode());
        dto.setName(product.getName());
        dto.setDescription(product.getDescription());

        if (product.getCategory() != null) {
            dto.setCategoryId(product.getCategory().getId());
            dto.setCategoryName(product.getCategory().getName());
        }

        if (product.getSubCategory() != null) {
            dto.setSubCategoryId(product.getSubCategory().getId());
            dto.setSubCategoryName(product.getSubCategory().getName());
        }

        dto.setCostPrice(product.getCostPrice());
        dto.setSellingPrice(product.getSellingPrice());
        dto.setCurrency(product.getCurrency());
        dto.setCurrentStock(product.getCurrentStock());
        dto.setReorderLevel(product.getReorderLevel());
        dto.setMaxStockLevel(product.getMaxStockLevel());
        dto.setStatus(product.getStatus());
        dto.setManufacturer(product.getManufacturer());
        dto.setBrand(product.getBrand());
        dto.setUnitOfMeasure(product.getUnitOfMeasure());
        dto.setWeight(product.getWeight());
        dto.setDimensions(product.getDimensions());
        dto.setImageUrl(product.getImageUrl());

        // Computed fields
        dto.setIsLowStock(product.isLowStock());
        dto.setIsOutOfStock(product.isOutOfStock());
        dto.setProfitMargin(product.getProfitMargin());
        dto.setStockValue(product.getStockValue());

        // Audit fields
        dto.setCreatedAt(product.getCreatedAt());
        dto.setUpdatedAt(product.getUpdatedAt());
        if (product.getCreatedBy() != null) {
            dto.setCreatedByUsername(product.getCreatedBy().getUsername());
        }
        if (product.getUpdatedBy() != null) {
            dto.setUpdatedByUsername(product.getUpdatedBy().getUsername());
        }

        return dto;
    }

    /**
     * Convert ProductDTO to entity
     */
    private Product convertToEntity(ProductDTO dto) {
        Product product = new Product();
        product.setSku(dto.getSku());
        product.setBarcode(dto.getBarcode());
        product.setName(dto.getName());
        product.setDescription(dto.getDescription());

        if (dto.getCategoryId() != null) {
            Category category = categoryRepository.findById(dto.getCategoryId())
                    .orElseThrow(
                            () -> new ResourceNotFoundException("Category not found with ID: " + dto.getCategoryId()));
            product.setCategory(category);
        }

        if (dto.getSubCategoryId() != null) {
            Category subCategory = categoryRepository.findById(dto.getSubCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Sub-category not found with ID: " + dto.getSubCategoryId()));
            product.setSubCategory(subCategory);
        }

        product.setCostPrice(dto.getCostPrice());
        product.setSellingPrice(dto.getSellingPrice());
        product.setCurrency(dto.getCurrency() != null ? dto.getCurrency() : "INR");
        product.setCurrentStock(dto.getCurrentStock() != null ? dto.getCurrentStock() : 0);
        product.setReorderLevel(dto.getReorderLevel());
        product.setMaxStockLevel(dto.getMaxStockLevel());
        product.setStatus(dto.getStatus() != null ? dto.getStatus() : ProductStatus.ACTIVE);
        product.setManufacturer(dto.getManufacturer());
        product.setBrand(dto.getBrand());
        product.setUnitOfMeasure(dto.getUnitOfMeasure());
        product.setWeight(dto.getWeight());
        product.setDimensions(dto.getDimensions());
        product.setImageUrl(dto.getImageUrl());

        return product;
    }

    /**
     * Update product fields from DTO
     */
    private void updateProductFields(Product product, ProductDTO dto) {
        product.setSku(dto.getSku());
        product.setBarcode(dto.getBarcode());
        product.setName(dto.getName());
        product.setDescription(dto.getDescription());

        if (dto.getCategoryId() != null) {
            Category category = categoryRepository.findById(dto.getCategoryId())
                    .orElseThrow(
                            () -> new ResourceNotFoundException("Category not found with ID: " + dto.getCategoryId()));
            product.setCategory(category);
        }

        if (dto.getSubCategoryId() != null) {
            Category subCategory = categoryRepository.findById(dto.getSubCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Sub-category not found with ID: " + dto.getSubCategoryId()));
            product.setSubCategory(subCategory);
        }

        product.setCostPrice(dto.getCostPrice());
        product.setSellingPrice(dto.getSellingPrice());
        product.setCurrency(dto.getCurrency());
        product.setReorderLevel(dto.getReorderLevel());
        product.setMaxStockLevel(dto.getMaxStockLevel());
        product.setManufacturer(dto.getManufacturer());
        product.setBrand(dto.getBrand());
        product.setUnitOfMeasure(dto.getUnitOfMeasure());
        product.setWeight(dto.getWeight());
        product.setDimensions(dto.getDimensions());
        product.setImageUrl(dto.getImageUrl());

        // Note: currentStock is NOT updated here - only via stock transactions
    }
}
