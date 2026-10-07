package com.xoana.repository;

import com.xoana.model.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ProductRepository extends JpaRepository<Product, Long> {
    Page<Product> findByDeletedAtIsNull(Pageable pageable);
    Page<Product> findByActiveTrueAndDeletedAtIsNull(Pageable pageable);
    List<Product> findByFeaturedTrueAndActiveTrueAndDeletedAtIsNull();
    Page<Product> findByCategoryAndActiveTrueAndDeletedAtIsNull(String category, Pageable pageable);

    @Query("SELECT p FROM Product p WHERE p.active = true AND p.deletedAt IS NULL AND " +
           "(:category IS NULL OR p.category = :category) AND " +
           "(LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(p.nameEn) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(p.description) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(p.descriptionEn) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    Page<Product> searchByKeyword(@Param("keyword") String keyword, @Param("category") String category, Pageable pageable);
}
