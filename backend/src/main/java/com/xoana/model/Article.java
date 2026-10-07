package com.xoana.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "articles")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Article {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 300)
    @NotBlank
    @Size(max = 300)
    private String title;

    @Column(length = 300)
    @Size(max = 300)
    private String titleEn;

    @Column(columnDefinition = "LONGTEXT")
    private String content;

    @Column(columnDefinition = "LONGTEXT")
    private String contentEn;

    @Column(length = 500)
    @Size(max = 500)
    private String summary;

    @Column(length = 500)
    @Size(max = 500)
    private String summaryEn;

    @Column(length = 500)
    @Size(max = 500)
    private String coverImage;

    @Column(length = 100)
    @Size(max = 100)
    private String category;

    @Column(length = 50)
    @Size(max = 50)
    private String author;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "article_tags", joinColumns = @JoinColumn(name = "article_id"))
    @Column(name = "tag", length = 50)
    @Builder.Default
    private List<@NotBlank @Size(max = 50) String> tags = new ArrayList<>();

    @Column(nullable = false)
    @Builder.Default
    private boolean published = false;

    @Column(name = "view_count")
    @Builder.Default
    private Integer viewCount = 0;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    @Column(name = "published_at")
    private LocalDateTime publishedAt;
}
