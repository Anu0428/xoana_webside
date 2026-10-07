package com.xoana.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonMappingException;
import com.xoana.dto.ApiResponse;
import com.xoana.model.Article;
import com.xoana.repository.ArticleRepository;
import jakarta.validation.Valid;
import jakarta.validation.Validator;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/articles")
public class ArticleController {

    private final ArticleRepository articleRepository;
    private final ObjectMapper objectMapper;
    private final Validator validator;

    public ArticleController(ArticleRepository articleRepository, ObjectMapper objectMapper, Validator validator) {
        this.articleRepository = articleRepository;
        this.objectMapper = objectMapper;
        this.validator = validator;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<Article>>> getPublishedArticles(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        PageRequest pageable = Pagination.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(ApiResponse.success(articleRepository.findByPublishedTrue(pageable)));
    }

    @GetMapping("/recent")
    public ResponseEntity<ApiResponse<List<Article>>> getRecentArticles() {
        return ResponseEntity.ok(ApiResponse.success(articleRepository.findTop5ByPublishedTrueOrderByCreatedAtDesc()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Article>> getArticle(@PathVariable Long id) {
        return articleRepository.findById(id)
                .filter(Article::isPublished)
                .map(a -> {
                    a.setViewCount(a.getViewCount() + 1);
                    articleRepository.save(a);
                    return ResponseEntity.ok(ApiResponse.success(a));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/admin/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Page<Article>>> getAllArticles(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        PageRequest pageable = Pagination.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(ApiResponse.success(articleRepository.findAll(pageable)));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Article>> createArticle(@Valid @RequestBody Article article) {
        article.setId(null);
        LocalDateTime now = LocalDateTime.now();
        article.setViewCount(0);
        article.setCreatedAt(now);
        article.setUpdatedAt(now);
        article.setPublishedAt(article.isPublished() ? now : null);
        return ResponseEntity.ok(ApiResponse.success(articleRepository.save(article)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Article>> updateArticle(@PathVariable Long id, @RequestBody Map<String, Object> updates) {
        updates.keySet().retainAll(List.of("title", "titleEn", "content", "contentEn", "summary", "summaryEn",
                "coverImage", "category", "author", "tags", "published"));
        return articleRepository.findById(id)
                .map(a -> {
                    boolean wasPublished = a.isPublished();
                    Article candidate = objectMapper.convertValue(a, Article.class);
                    try {
                        objectMapper.updateValue(candidate, updates);
                    } catch (JsonMappingException exception) {
                        return ResponseEntity.badRequest().body(ApiResponse.<Article>error("文章字段格式不正确"));
                    }
                    if (!validator.validate(candidate).isEmpty()) {
                        return ResponseEntity.badRequest().body(ApiResponse.<Article>error("文章信息不完整或格式不正确"));
                    }
                    if (candidate.isPublished() && !wasPublished) {
                        candidate.setPublishedAt(LocalDateTime.now());
                    }
                    candidate.setUpdatedAt(LocalDateTime.now());
                    return ResponseEntity.ok(ApiResponse.success(articleRepository.save(candidate)));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteArticle(@PathVariable Long id) {
        if (!articleRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        articleRepository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.<Void>success("Article deleted", null));
    }
}
