package com.xoana.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonMappingException;
import com.xoana.dto.ApiResponse;
import com.xoana.model.Product;
import com.xoana.repository.ProductRepository;
import jakarta.validation.Valid;
import jakarta.validation.Validator;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductRepository productRepository;
    private final ObjectMapper objectMapper;
    private final Validator validator;

    public ProductController(ProductRepository productRepository, ObjectMapper objectMapper, Validator validator) {
        this.productRepository = productRepository;
        this.objectMapper = objectMapper;
        this.validator = validator;
    }

    @GetMapping("/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Page<Product>>> getAllProductsForAdmin(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size) {
        PageRequest pageable = Pagination.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(ApiResponse.success(productRepository.findByDeletedAtIsNull(pageable)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<Product>>> getAllProducts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String keyword) {
        PageRequest pageable = Pagination.of(page, size, Sort.by("createdAt").descending());
        String selectedCategory = category == null || category.isBlank() ? null : category.trim();
        Page<Product> products;
        if (keyword != null && !keyword.isBlank()) {
            products = productRepository.searchByKeyword(keyword.trim(), selectedCategory, pageable);
        } else if (selectedCategory != null) {
            products = productRepository.findByCategoryAndActiveTrueAndDeletedAtIsNull(selectedCategory, pageable);
        } else {
            products = productRepository.findByActiveTrueAndDeletedAtIsNull(pageable);
        }
        return ResponseEntity.ok(ApiResponse.success(products));
    }

    @GetMapping("/featured")
    public ResponseEntity<ApiResponse<List<Product>>> getFeaturedProducts() {
        return ResponseEntity.ok(ApiResponse.success(productRepository.findByFeaturedTrueAndActiveTrueAndDeletedAtIsNull()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Product>> getProduct(@PathVariable Long id) {
        return productRepository.findById(id)
                .filter(p -> p.getDeletedAt() == null)
                .filter(Product::isActive)
                .map(p -> ResponseEntity.ok(ApiResponse.success(p)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Product>> createProduct(@Valid @RequestBody Product product) {
        product.setId(null);
        product.setDeletedAt(null);
        LocalDateTime now = LocalDateTime.now();
        product.setCreatedAt(now);
        product.setUpdatedAt(now);
        return ResponseEntity.ok(ApiResponse.success(productRepository.save(product)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Product>> updateProduct(@PathVariable Long id, @RequestBody Map<String, Object> updates) {
        updates.keySet().retainAll(List.of("name", "nameEn", "description", "descriptionEn", "price", "stock",
                "category", "coverImage", "images", "material", "dimensions", "featured", "active"));
        return productRepository.findById(id)
                .filter(p -> p.getDeletedAt() == null)
                .map(p -> {
                    Product candidate = objectMapper.convertValue(p, Product.class);
                    try {
                        objectMapper.updateValue(candidate, updates);
                    } catch (JsonMappingException exception) {
                        return ResponseEntity.badRequest().body(ApiResponse.<Product>error("商品字段格式不正确"));
                    }
                    if (!validator.validate(candidate).isEmpty()) {
                        return ResponseEntity.badRequest().body(ApiResponse.<Product>error("商品信息不完整或格式不正确"));
                    }
                    candidate.setUpdatedAt(LocalDateTime.now());
                    return ResponseEntity.ok(ApiResponse.success(productRepository.save(candidate)));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteProduct(@PathVariable Long id) {
        return productRepository.findById(id)
                .map(p -> {
                    if (p.getDeletedAt() == null) {
                        LocalDateTime now = LocalDateTime.now();
                        p.setActive(false);
                        p.setDeletedAt(now);
                        p.setUpdatedAt(now);
                        productRepository.save(p);
                    }
                    return ResponseEntity.ok(ApiResponse.<Void>success("Product deleted", null));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
