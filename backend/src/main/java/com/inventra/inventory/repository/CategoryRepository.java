package com.inventra.inventory.repository;

import com.inventra.inventory.model.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {

    Optional<Category> findByName(String name);

    boolean existsByName(String name);

    List<Category> findByIsActive(Boolean isActive);

    // Find root categories (no parent)
    List<Category> findByParentCategoryIsNull();

    // Find sub-categories of a parent
    List<Category> findByParentCategoryId(Long parentId);

    // Find all active root categories
    @Query("SELECT c FROM Category c WHERE c.parentCategory IS NULL AND c.isActive = true")
    List<Category> findActiveRootCategories();
}
