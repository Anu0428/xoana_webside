package com.xoana.repository;

import com.xoana.model.Article;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ArticleRepository extends JpaRepository<Article, Long> {
    Page<Article> findByPublishedTrue(Pageable pageable);
    List<Article> findTop5ByPublishedTrueOrderByCreatedAtDesc();
}
