package com.xoana;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.xoana.model.Article;
import com.xoana.model.Order;
import com.xoana.model.Product;
import com.xoana.model.SiteSettings;
import com.xoana.model.User;
import com.xoana.repository.ArticleRepository;
import com.xoana.repository.OrderRepository;
import com.xoana.repository.ProductRepository;
import com.xoana.repository.SiteSettingsRepository;
import com.xoana.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
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
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
@Transactional
class RuntimeFlowTests {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired UserRepository users;
    @Autowired ProductRepository products;
    @Autowired ArticleRepository articles;
    @Autowired OrderRepository orders;
    @Autowired SiteSettingsRepository settings;

    private User owner;
    private Product product;

    @BeforeEach
    void prepare() {
        owner = users.saveAndFlush(User.builder().username("order_owner").email("owner@example.com")
                .password("unused").role(User.Role.USER).build());
        product = products.saveAndFlush(Product.builder().name("Runtime product").price(BigDecimal.TEN).stock(10).build());
    }

    @ParameterizedTest
    @ValueSource(strings = {"{}", "{\"items\":[]}", "{\"items\":[null]}",
            "{\"items\":[{\"productId\":1}]}", "{\"items\":[{\"quantity\":1}]}",
            "{\"items\":[{\"productId\":1,\"quantity\":0}]}",
            "{\"items\":[{\"productId\":1,\"quantity\":-2}]}"})
    @WithMockUser(username = "order_owner", roles = "USER")
    void malformedOrdersReturnClientErrorsWithoutBeingStored(String body) throws Exception {
        long before = orders.count();
        mvc.perform(post("/api/orders").contentType("application/json").content(body))
                .andExpect(status().isBadRequest());
        assertThat(orders.count()).isEqualTo(before);
    }

    @Test
    @WithMockUser(username = "order_owner", roles = "USER")
    void nonexistentAndInactiveProductsCannotBeOrdered() throws Exception {
        mvc.perform(post("/api/orders").contentType("application/json").content(orderBody(999999L)))
                .andExpect(status().isBadRequest());
        product.setActive(false);
        products.saveAndFlush(product);
        mvc.perform(post("/api/orders").contentType("application/json").content(orderBody(product.getId())))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(username = "test", roles = "USER")
    void customersCannotPayAnotherCustomersOrder() throws Exception {
        Order order = saveOrder(Order.OrderStatus.PENDING);
        mvc.perform(post("/api/orders/" + order.getId() + "/pay").param("method", "ALIPAY"))
                .andExpect(status().isNotFound());
        assertThat(orders.findById(order.getId()).orElseThrow().getStatus()).isEqualTo(Order.OrderStatus.PENDING);
    }

    @Test
    @WithMockUser(username = "order_owner", roles = "USER")
    void paymentPersistsTheMethodAndRepeatedRequestsReusePayment() throws Exception {
        Order order = saveOrder(Order.OrderStatus.PENDING);
        String firstResponse = mvc.perform(post("/api/orders/" + order.getId() + "/pay").param("method", "PAYPAL"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String paymentId = mapper.readTree(firstResponse).path("data").path("paymentId").asText();
        mvc.perform(post("/api/orders/" + order.getId() + "/pay").param("method", "ALIPAY"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.paymentId").value(paymentId));
        Order stored = orders.findById(order.getId()).orElseThrow();
        assertThat(stored.getPaymentMethod()).isEqualTo(Order.PaymentMethod.PAYPAL);
        assertThat(stored.getPaidAt()).isNotNull();
    }

    @ParameterizedTest
    @ValueSource(strings = {"SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"})
    @WithMockUser(username = "order_owner", roles = "USER")
    void paymentCannotResetAnOrderThatAlreadyProgressed(String status) throws Exception {
        Order order = saveOrder(Order.OrderStatus.valueOf(status));
        mvc.perform(post("/api/orders/" + order.getId() + "/pay").param("method", "ALIPAY"))
                .andExpect(status().isConflict());
        assertThat(orders.findById(order.getId()).orElseThrow().getStatus()).isEqualTo(Order.OrderStatus.valueOf(status));
    }

    @Test
    @WithMockUser(username = "order_owner", roles = "USER")
    void disabledCheckoutAlsoRejectsDirectApiCalls() throws Exception {
        SiteSettings current = settings.findById(1L).orElseThrow();
        current.setCheckoutEnabled(false);
        settings.saveAndFlush(current);
        Order order = saveOrder(Order.OrderStatus.PENDING);
        mvc.perform(post("/api/orders").contentType("application/json").content(orderBody(product.getId())))
                .andExpect(status().isConflict());
        mvc.perform(post("/api/orders/" + order.getId() + "/pay").param("method", "ALIPAY"))
                .andExpect(status().isConflict());
        assertThat(orders.findById(order.getId()).orElseThrow().getStatus()).isEqualTo(Order.OrderStatus.PENDING);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void productEditsPreserveFieldsOmittedByTheForm() throws Exception {
        LocalDateTime createdAt = LocalDateTime.of(2024, 1, 1, 12, 0);
        product.setCreatedAt(createdAt);
        product.setImages(new ArrayList<>(List.of("/uploads/original.png")));
        product.setMaterial("Original material");
        product.setFeatured(true);
        products.saveAndFlush(product);
        mvc.perform(put("/api/products/" + product.getId()).contentType("application/json")
                        .content("{\"name\":\"Edited\",\"price\":20,\"createdAt\":\"2000-01-01T00:00:00\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.name").value("Edited"));
        Product stored = products.findById(product.getId()).orElseThrow();
        assertThat(stored.getCreatedAt()).isEqualTo(createdAt);
        assertThat(stored.getImages()).containsExactly("/uploads/original.png");
        assertThat(stored.getMaterial()).isEqualTo("Original material");
        assertThat(stored.isFeatured()).isTrue();
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void articleEditsPreservePublicationDataTagsAndViewCount() throws Exception {
        LocalDateTime historical = LocalDateTime.of(2024, 1, 1, 12, 0);
        Article article = articles.saveAndFlush(Article.builder().title("Before edit").published(true)
                .viewCount(55).createdAt(historical).publishedAt(historical)
                .tags(new ArrayList<>(List.of("original"))).build());
        mvc.perform(put("/api/articles/" + article.getId()).contentType("application/json")
                        .content("{\"title\":\"Edited\",\"viewCount\":0}"))
                .andExpect(status().isOk());
        Article stored = articles.findById(article.getId()).orElseThrow();
        assertThat(stored.getTitle()).isEqualTo("Edited");
        assertThat(stored.getViewCount()).isEqualTo(55);
        assertThat(stored.getCreatedAt()).isEqualTo(historical);
        assertThat(stored.getPublishedAt()).isEqualTo(historical);
        assertThat(stored.getTags()).containsExactly("original");
        assertThat(stored.isPublished()).isTrue();
    }

    @Test
    void frontendOnAlternateDevelopmentPortPassesCorsPreflight() throws Exception {
        mvc.perform(options("/api/auth/login").header("Origin", "http://localhost:3001")
                        .header("Access-Control-Request-Method", "POST")
                        .header("Access-Control-Request-Headers", "Content-Type"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:3001"));
    }

    private Order saveOrder(Order.OrderStatus status) {
        return orders.saveAndFlush(Order.builder().orderNo("runtime-" + java.util.UUID.randomUUID())
                .user(owner).totalAmount(BigDecimal.TEN).status(status).paymentMethod(Order.PaymentMethod.ALIPAY).build());
    }

    private String orderBody(long productId) {
        return "{\"items\":[{\"productId\":" + productId + ",\"quantity\":1}],\"paymentMethod\":\"ALIPAY\","
                + "\"shippingAddress\":\"Test address\",\"contactName\":\"Owner\",\"contactPhone\":\"13800000000\"}";
    }
}
