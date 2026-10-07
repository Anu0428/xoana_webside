package com.xoana.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Digits;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@Entity
@Table(name = "products")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    @NotBlank
    @Size(max = 200)
    private String name;

    @Column(length = 200)
    @Size(max = 200)
    private String nameEn;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String descriptionEn;

    @Column(nullable = false, precision = 10, scale = 2)
    @NotNull
    @PositiveOrZero
    @Digits(integer = 8, fraction = 2)
    private BigDecimal price;

    @Column(nullable = false)
    @Builder.Default
    @NotNull
    @PositiveOrZero
    private Integer stock = 0;

    @Column(length = 100)
    @Size(max = 100)
    private String category;

    @Column(length = 500)
    @Size(max = 500)
    private String coverImage;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "product_images", joinColumns = @JoinColumn(name = "product_id"))
    @Column(name = "image_url", length = 500)
    @Builder.Default
    private List<@NotBlank @Size(max = 500) String> images = new ArrayList<>();

    @Column(length = 100)
    @Size(max = 100)
    private String material;

    @Column(length = 100)
    @Size(max = 100)
    private String dimensions;

    @Column(nullable = false)
    @Builder.Default
    private boolean featured = false;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    // Keep the product row for historical order references after catalog deletion.
    @Column(name = "deleted_at")
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private LocalDateTime deletedAt;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
