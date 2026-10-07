package com.xoana;

import com.xoana.model.Article;
import com.xoana.model.Order;
import com.xoana.model.OrderItem;
import com.xoana.model.Product;
import com.xoana.model.SiteTraffic;
import com.xoana.model.User;
import com.xoana.repository.ArticleRepository;
import com.xoana.repository.ContactMessageRepository;
import com.xoana.repository.OrderRepository;
import com.xoana.repository.ProductRepository;
import com.xoana.repository.SiteTrafficRepository;
import com.xoana.repository.UserRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.ArrayList;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
@Transactional
class AuditRegressionTests {
    @Autowired MockMvc mvc;
    @Autowired ProductRepository products;
    @Autowired ArticleRepository articles;
    @Autowired OrderRepository orders;
    @Autowired UserRepository users;
    @Autowired ContactMessageRepository messages;
    @Autowired SiteTrafficRepository traffic;
    @Autowired EntityManager entityManager;

    private User customer;
    private Product product;

    @BeforeEach
    void prepare() {
        customer = users.saveAndFlush(User.builder().username("audit_customer").email("audit@example.com")
                .password("unused").nickname("Original nickname").role(User.Role.USER).build());
        product = products.saveAndFlush(Product.builder().name("Original product")
                .price(BigDecimal.TEN).stock(10).build());
    }

    @ParameterizedTest
    @ValueSource(strings = {"{\"name\":null,\"email\":\"valid@example.com\",\"message\":\"Hello\"}",
            "{\"name\":\"Customer\",\"email\":\"invalid\",\"message\":\"Hello\"}",
            "{\"name\":\"Customer\",\"email\":\"valid@example.com\",\"message\":null}"})
    @WithMockUser(roles = "USER")
    void malformedContactMessagesReturnApiErrorsWithoutSaving(String body) throws Exception {
        long before = messages.count();
        mvc.perform(post("/api/contact").contentType("application/json").content(body))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.success").value(false));
        assertThat(messages.count()).isEqualTo(before);
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/products", "/api/articles", "/api/orders/admin/all",
            "/api/users/admin/all", "/api/contact"})
    @WithMockUser(roles = "ADMIN")
    void invalidPaginationIsAClientErrorForEveryList(String path) throws Exception {
        for (String[] parameters : List.of(new String[]{"page", "-1"}, new String[]{"size", "0"},
                new String[]{"size", "1001"}, new String[]{"size", "invalid"})) {
            mvc.perform(get(path).param(parameters[0], parameters[1]))
                    .andExpect(status().isBadRequest()).andExpect(jsonPath("$.success").value(false));
        }
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void rejectedProductUpdatesNeverChangeTheManagedEntity() throws Exception {
        mvc.perform(put("/api/products/" + product.getId()).contentType("application/json")
                        .content("{\"name\":\"Rejected edit\",\"price\":-1}"))
                .andExpect(status().isBadRequest());
        mvc.perform(put("/api/products/" + product.getId()).contentType("application/json")
                        .content("{\"name\":\"Rejected edit\",\"stock\":\"invalid\"}"))
                .andExpect(status().isBadRequest());
        entityManager.flush();
        entityManager.clear();
        Product stored = products.findById(product.getId()).orElseThrow();
        assertThat(stored.getName()).isEqualTo("Original product");
        assertThat(stored.getPrice()).isEqualByComparingTo(BigDecimal.TEN);
        assertThat(stored.getStock()).isEqualTo(10);
    }

    @Test
    void productSearchAppliesTheSelectedCategoryTogetherWithTheKeyword() throws Exception {
        Product deck = products.saveAndFlush(Product.builder().name("Shared filter deck")
                .category("decks").price(BigDecimal.TEN).build());
        products.saveAndFlush(Product.builder().name("Shared filter truck")
                .category("trucks").price(BigDecimal.TEN).build());
        mvc.perform(get("/api/products").param("keyword", " Shared filter ").param("category", "decks"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.totalElements").value(1))
                .andExpect(jsonPath("$.data.content[0].id").value(deck.getId()));
        mvc.perform(get("/api/products").param("keyword", "Shared filter").param("category", " "))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.totalElements").value(2));
    }

    @Test
    void productSearchMatchesEnglishNamesAndDescriptionsWithoutCaseSensitivity() throws Exception {
        products.saveAndFlush(Product.builder().name("英文名称搜索测试").nameEn("Maple Traveler")
                .price(BigDecimal.TEN).build());
        products.saveAndFlush(Product.builder().name("英文介绍搜索测试").descriptionEn("Handcrafted maple fingerboard")
                .price(BigDecimal.TEN).build());
        mvc.perform(get("/api/products").param("keyword", "MAPLE"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.totalElements").value(2));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void rejectedArticleUpdatesNeverChangeTheManagedEntity() throws Exception {
        Article article = articles.saveAndFlush(Article.builder().title("Original title").build());
        mvc.perform(put("/api/articles/" + article.getId()).contentType("application/json")
                        .content("{\"title\":\"\",\"published\":true}"))
                .andExpect(status().isBadRequest());
        entityManager.flush();
        entityManager.clear();
        Article stored = articles.findById(article.getId()).orElseThrow();
        assertThat(stored.getTitle()).isEqualTo("Original title");
        assertThat(stored.isPublished()).isFalse();
        assertThat(stored.getPublishedAt()).isNull();
    }

    @Test
    void invalidProfileLengthsReturnApiErrorsWithoutChangingTheAccount() throws Exception {
        mvc.perform(put("/api/users/me").with(user(customer.getUsername()).roles("USER"))
                        .contentType("application/json").content("{\"nickname\":\"" + "x".repeat(51) + "\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.success").value(false));
        assertThat(users.findById(customer.getId()).orElseThrow().getNickname()).isEqualTo("Original nickname");
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void articleCreationIgnoresClientCountersAndHistoricalDates() throws Exception {
        mvc.perform(post("/api/articles").contentType("application/json")
                        .content("{\"title\":\"New article\",\"viewCount\":null,\"publishedAt\":\"2000-01-01T00:00:00\","
                                + "\"createdAt\":null,\"updatedAt\":null}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.viewCount").value(0))
                .andExpect(jsonPath("$.data.publishedAt").isEmpty())
                .andExpect(jsonPath("$.data.createdAt").isNotEmpty())
                .andExpect(jsonPath("$.data.updatedAt").isNotEmpty());
    }

    @ParameterizedTest
    @CsvSource({"PENDING,PAID", "PENDING,SHIPPED", "PAID,PENDING", "CANCELLED,PAID", "REFUNDED,PAID"})
    @WithMockUser(roles = "ADMIN")
    void administrativeStatusEditsCannotBypassPaymentOrResetItsState(String current, String next) throws Exception {
        Order order = order(Order.OrderStatus.valueOf(current));
        mvc.perform(put("/api/orders/" + order.getId() + "/status").param("status", next))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.success").value(false));
        assertThat(orders.findById(order.getId()).orElseThrow().getStatus()).isEqualTo(Order.OrderStatus.valueOf(current));
        assertThat(products.findById(product.getId()).orElseThrow().getStock()).isEqualTo(10);
    }

    @ParameterizedTest
    @CsvSource({"PENDING,CANCELLED", "PAID,SHIPPED", "SHIPPED,DELIVERED", "PAID,REFUNDED"})
    @WithMockUser(roles = "ADMIN")
    void administrativeStatusEditsAllowTheNormalOrderLifecycle(String current, String next) throws Exception {
        Order order = order(Order.OrderStatus.valueOf(current));
        mvc.perform(put("/api/orders/" + order.getId() + "/status").param("status", next))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.status").value(next));
    }

    @Test
    void refundingAnUnshippedPaymentRestoresStockExactlyOnce() throws Exception {
        product.setStock(1);
        products.saveAndFlush(product);
        Order order = Order.builder().orderNo("audit-refund").user(customer)
                .totalAmount(BigDecimal.TEN).status(Order.OrderStatus.PENDING).build();
        OrderItem item = OrderItem.builder().order(order).product(product).productName(product.getName())
                .quantity(1).unitPrice(BigDecimal.TEN).totalPrice(BigDecimal.TEN).build();
        order.setItems(new ArrayList<>(List.of(item)));
        orders.saveAndFlush(order);
        mvc.perform(post("/api/orders/" + order.getId() + "/pay").param("method", "ALIPAY")
                        .with(user(customer.getUsername()).roles("USER")))
                .andExpect(status().isOk());
        entityManager.flush();
        assertThat(products.findById(product.getId()).orElseThrow().getStock()).isZero();
        for (int attempt = 0; attempt < 2; attempt++) {
            mvc.perform(put("/api/orders/" + order.getId() + "/status").param("status", "REFUNDED")
                            .with(user("admin").roles("ADMIN")))
                    .andExpect(status().isOk());
            entityManager.flush();
            entityManager.clear();
            assertThat(products.findById(product.getId()).orElseThrow().getStock()).isEqualTo(1);
        }
    }

    @Test
    void dailyTrafficKeepsTheSameDayInDifferentMonthsSeparate() {
        traffic.saveAllAndFlush(List.of(
                SiteTraffic.builder().pagePath("/").visitedAt(LocalDateTime.of(2026, 1, 1, 10, 0)).build(),
                SiteTraffic.builder().pagePath("/").visitedAt(LocalDateTime.of(2026, 2, 1, 10, 0)).build(),
                SiteTraffic.builder().pagePath("/").visitedAt(LocalDateTime.of(2026, 2, 1, 12, 0)).build()));
        List<Object[]> counts = traffic.getDailyVisits(LocalDateTime.of(2026, 1, 1, 0, 0), LocalDateTime.of(2026, 2, 2, 0, 0));
        assertThat(counts).hasSize(2);
        assertThat(counts.get(0)[0].toString()).isEqualTo("2026-01-01");
        assertThat(((Number) counts.get(0)[1]).longValue()).isEqualTo(1);
        assertThat(counts.get(1)[0].toString()).isEqualTo("2026-02-01");
        assertThat(((Number) counts.get(1)[1]).longValue()).isEqualTo(2);
    }

    @ParameterizedTest
    @ValueSource(strings = {"-1", "0", "366", "2147483647"})
    @WithMockUser(roles = "ADMIN")
    void invalidTrafficWindowsReturnClientErrors(String days) throws Exception {
        mvc.perform(get("/api/traffic/stats").param("days", days))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void trafficTrackingFitsLongHeadersIntoDatabaseColumns() throws Exception {
        mvc.perform(post("/api/traffic/track").contentType("application/json")
                        .content("{\"path\":\"/" + "p".repeat(300) + "\"}")
                        .header("User-Agent", "u".repeat(600)).header("Referer", "r".repeat(600)))
                .andExpect(status().isOk());
        entityManager.flush();
        SiteTraffic stored = traffic.findAll().get(0);
        assertThat(stored.getPagePath()).hasSize(200);
        assertThat(stored.getUserAgent()).hasSize(500);
        assertThat(stored.getReferer()).hasSize(500);
    }

    private Order order(Order.OrderStatus status) {
        return orders.saveAndFlush(Order.builder().orderNo("audit-" + java.util.UUID.randomUUID())
                .user(customer).totalAmount(BigDecimal.TEN).status(status).build());
    }
}
