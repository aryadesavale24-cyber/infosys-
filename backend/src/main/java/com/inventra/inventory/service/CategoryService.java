package com.inventra.inventory.service;

import com.inventra.inventory.dto.CategoryDTO;
import com.inventra.inventory.exception.DuplicateResourceException;
import com.inventra.inventory.exception.ResourceNotFoundException;
import com.inventra.inventory.model.Category;
import com.inventra.inventory.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CategoryService {

    private final CategoryRepository categoryRepository;

    /**
     * Create a new category
     */
    @Transactional
    public CategoryDTO createCategory(CategoryDTO categoryDTO) {
        log.info("Creating new category: {}", categoryDTO.getName());

        if (categoryRepository.existsByName(categoryDTO.getName())) {
            throw new DuplicateResourceException("Category with name " + categoryDTO.getName() + " already exists");
        }

        Category category = convertToEntity(categoryDTO);
        Category savedCategory = categoryRepository.save(category);

        log.info("Category created successfully with ID: {}", savedCategory.getId());
        return convertToDTO(savedCategory);
    }

    /**
     * Get category by ID
     */
    @Transactional(readOnly = true)
    public CategoryDTO getCategoryById(Long id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with ID: " + id));
        return convertToDTO(category);
    }

    /**
     * Get all categories
     */
    @Transactional(readOnly = true)
    public List<CategoryDTO> getAllCategories() {
        return categoryRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get all root categories (no parent)
     */
    @Transactional(readOnly = true)
    public List<CategoryDTO> getRootCategories() {
        return categoryRepository.findByParentCategoryIsNull().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get sub-categories of a parent category
     */
    @Transactional(readOnly = true)
    public List<CategoryDTO> getSubCategories(Long parentId) {
        return categoryRepository.findByParentCategoryId(parentId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Update category
     */
    @Transactional
    public CategoryDTO updateCategory(Long id, CategoryDTO categoryDTO) {
        log.info("Updating category with ID: {}", id);

        Category existingCategory = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with ID: " + id));

        // Check name uniqueness if changed
        if (!existingCategory.getName().equals(categoryDTO.getName())) {
            if (categoryRepository.existsByName(categoryDTO.getName())) {
                throw new DuplicateResourceException("Category with name " + categoryDTO.getName() + " already exists");
            }
        }

        existingCategory.setName(categoryDTO.getName());
        existingCategory.setDescription(categoryDTO.getDescription());
        existingCategory.setIsActive(categoryDTO.getIsActive());

        if (categoryDTO.getParentCategoryId() != null) {
            Category parentCategory = categoryRepository.findById(categoryDTO.getParentCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Parent category not found with ID: " + categoryDTO.getParentCategoryId()));
            existingCategory.setParentCategory(parentCategory);
        }

        Category updatedCategory = categoryRepository.save(existingCategory);
        log.info("Category updated successfully");

        return convertToDTO(updatedCategory);
    }

    /**
     * Delete category
     */
    @Transactional
    public void deleteCategory(Long id) {
        log.info("Deleting category with ID: {}", id);

        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with ID: " + id));

        // Check if category has sub-categories
        if (!category.getSubCategories().isEmpty()) {
            throw new IllegalStateException("Cannot delete category with sub-categories");
        }

        categoryRepository.delete(category);
        log.info("Category deleted successfully");
    }

    /**
     * Convert Category entity to DTO
     */
    private CategoryDTO convertToDTO(Category category) {
        CategoryDTO dto = new CategoryDTO();
        dto.setId(category.getId());
        dto.setName(category.getName());
        dto.setDescription(category.getDescription());
        dto.setIsActive(category.getIsActive());
        dto.setCreatedAt(category.getCreatedAt());
        dto.setUpdatedAt(category.getUpdatedAt());

        if (category.getParentCategory() != null) {
            dto.setParentCategoryId(category.getParentCategory().getId());
            dto.setParentCategoryName(category.getParentCategory().getName());
        }

        // Convert sub-categories (without recursion to avoid infinite loop)
        if (category.getSubCategories() != null && !category.getSubCategories().isEmpty()) {
            List<CategoryDTO> subCategoryDTOs = category.getSubCategories().stream()
                    .map(subCat -> {
                        CategoryDTO subDto = new CategoryDTO();
                        subDto.setId(subCat.getId());
                        subDto.setName(subCat.getName());
                        subDto.setDescription(subCat.getDescription());
                        subDto.setIsActive(subCat.getIsActive());
                        return subDto;
                    })
                    .collect(Collectors.toList());
            dto.setSubCategories(subCategoryDTOs);
        }

        return dto;
    }

    /**
     * Convert CategoryDTO to entity
     */
    private Category convertToEntity(CategoryDTO dto) {
        Category category = new Category();
        category.setName(dto.getName());
        category.setDescription(dto.getDescription());
        category.setIsActive(dto.getIsActive() != null ? dto.getIsActive() : true);

        if (dto.getParentCategoryId() != null) {
            Category parentCategory = categoryRepository.findById(dto.getParentCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Parent category not found with ID: " + dto.getParentCategoryId()));
            category.setParentCategory(parentCategory);
        }

        return category;
    }
}
