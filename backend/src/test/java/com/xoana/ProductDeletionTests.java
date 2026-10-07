package com.xoana;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.xoana.model.Order;
import com.xoana.model.OrderItem;
import com.xoana.model.Product;
import com.xoana.model.User;
import com.xoana.repository.OrderRepository;
import com.xoana.repository.ProductRepository;
import com.xoana.repository.UserRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
@Transactional
class ProductDeletionTests {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired ProductRepository products;
    @Autowired OrderRepository orders;
    @Autowired UserRepository users;
    @Autowired EntityManager entityManager;

    private Product product;
    private Product inactiveProduct;

    @BeforeEach
    void prepareProductsAndCustomer() {
        users.saveAndFlush(User.builder().username("deletion_customer").email("deletion@example.com")
                .password("unused").role(User.Role.USER).build());
        product = products.saveAndFlush(Product.builder().name("Deletion regression deck")
                .description("Deletion regression description").category("deletion-regression")
                .price(BigDecimal.TEN).stock(10).featured(true).coverImage("/uploads/deletion-test.png")
                .images(new ArrayList<>(List.of("/uploads/deletion-test.png"))).build());
        inactiveProduct = products.saveAndFlush(Product.builder().name("Inactive regression deck")
                .price(BigDecimal.TEN).stock(10).active(false).build());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void deletionRemovesTheProductFromRefreshedAdminPagesAndCanBeRepeated() throws Exception {
        JsonNode before = data(get("/api/products/all").param("size", "1000"));
        assertThat(ids(before.path("content"))).contains(product.getId(), inactiveProduct.getId());

        mvc.perform(delete("/api/products/" + product.getId()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.success").value(true));
        entityManager.flush();
        entityManager.clear();
        Product deleted = products.findById(product.getId()).orElseThrow();
        LocalDateTime deletedAt = deleted.getDeletedAt();
        assertThat(deletedAt).isNotNull();
        assertThat(deleted.isActive()).isFalse();

        JsonNode after = data(get("/api/products/all").param("size", "1000"));
        long remaining = before.path("totalElements").asLong() - 1;
        assertThat(after.path("totalElements").asLong()).isEqualTo(remaining);
        assertThat(ids(after.path("content"))).contains(inactiveProduct.getId()).doesNotContain(product.getId());
        JsonNode lastPage = data(get("/api/products/all").param("size", "1")
                .param("page", Long.toString(remaining - 1)));
        assertThat(lastPage.path("totalElements").asLong()).isEqualTo(remaining);
        assertThat(lastPage.path("totalPages").asLong()).isEqualTo(remaining);
        assertThat(lastPage.path("content").size()).isEqualTo(1);
        assertThat(lastPage.path("last").asBoolean()).isTrue();

        mvc.perform(delete("/api/products/" + product.getId())).andExpect(status().isOk());
        mvc.perform(put("/api/products/" + product.getId()).contentType("application/json")
                        .content("{\"name\":\"Restored\",\"active\":true,\"deletedAt\":null}"))
                .andExpect(status().isNotFound());
        entityManager.flush();
        entityManager.clear();
        assertThat(products.findById(product.getId()).orElseThrow().getDeletedAt()).isEqualTo(deletedAt);
        assertThat(data(get("/api/products/all")).path("totalElements").asLong()).isEqualTo(remaining);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void takingAProductOffSaleStillAllowsEditingAndPuttingItBackOnSale() throws Exception {
        mvc.perform(put("/api/products/" + product.getId()).contentType("application/json")
                        .content("{\"active\":false}"))
                .andExpect(status().isOk());
        assertThat(ids(data(get("/api/products/all").param("size", "1000")).path("content")))
                .contains(product.getId());
        assertThat(products.findById(product.getId()).orElseThrow().getDeletedAt()).isNull();
        mvc.perform(get("/api/products/" + product.getId())).andExpect(status().isNotFound());

        mvc.perform(put("/api/products/" + product.getId()).contentType("application/json")
                        .content("{\"name\":\"Edited off-sale deck\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.active").value(false));
        mvc.perform(put("/api/products/" + product.getId()).contentType("application/json")
                        .content("{\"active\":true}"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/products/" + product.getId())).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("Edited off-sale deck"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void deletedProductsStayHiddenAcrossPublicQueriesEvenWithAnActiveFlag() throws Exception {
        Product visible = products.saveAndFlush(Product.builder().name("Deletion regression survivor")
                .category("deletion-regression").price(BigDecimal.TEN).stock(10).featured(true).build());
        mvc.perform(delete("/api/products/" + product.getId())).andExpect(status().isOk());
        // The deletion state must independently exclude rows from every catalog query.
        Product deleted = products.findById(product.getId()).orElseThrow();
        deleted.setActive(true);
        products.saveAndFlush(deleted);

        assertThat(ids(data(get("/api/products").param("size", "1000")).path("content")))
                .contains(visible.getId()).doesNotContain(product.getId());
        for (String parameter : List.of("category", "keyword")) {
            String value = parameter.equals("category") ? "deletion-regression" : "Deletion regression";
            JsonNode result = data(get("/api/products").param(parameter, value));
            assertThat(ids(result.path("content"))).containsExactly(visible.getId());
            assertThat(result.path("totalElements").asLong()).isEqualTo(1);
        }
        assertThat(ids(data(get("/api/products/featured"))))
                .contains(visible.getId()).doesNotContain(product.getId());
        mvc.perform(get("/api/products/" + product.getId())).andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void creatingAProductIgnoresAClientSuppliedDeletionDate() throws Exception {
        JsonNode created = data(post("/api/products").contentType("application/json")
                .content("{\"name\":\"Fresh deck\",\"price\":10,\"stock\":1,"
                        + "\"deletedAt\":\"2020-01-01T00:00:00\"}"));
        long id = created.path("id").asLong();
        entityManager.flush();
        entityManager.clear();
        assertThat(products.findById(id).orElseThrow().getDeletedAt()).isNull();
        mvc.perform(get("/api/products/" + id)).andExpect(status().isOk());
    }

    @Test
    void deletingAProductPreservesPaidOrdersAndTheirProductReferences() throws Exception {
        long orderId = createOrder();
        mvc.perform(post("/api/orders/" + orderId + "/pay").param("method", "ALIPAY")
                        .with(user("deletion_customer").roles("USER")))
                .andExpect(status().isOk());
        mvc.perform(delete("/api/products/" + product.getId()).with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk());
        entityManager.flush();
        entityManager.clear();

        Order historical = orders.findById(orderId).orElseThrow();
        assertThat(historical.getStatus()).isEqualTo(Order.OrderStatus.PAID);
        assertThat(historical.getTotalAmount()).isEqualByComparingTo(BigDecimal.TEN);
        assertThat(historical.getPaymentId()).isNotBlank();
        assertThat(historical.getItems()).hasSize(1);
        OrderItem item = historical.getItems().get(0);
        assertThat(item.getProduct().getId()).isEqualTo(product.getId());
        assertThat(item.getProduct().getDeletedAt()).isNotNull();
        assertThat(item.getProductName()).isEqualTo("Deletion regression deck");
        assertThat(item.getProductImage()).isEqualTo("/uploads/deletion-test.png");
        assertThat(item.getUnitPrice()).isEqualByComparingTo(BigDecimal.TEN);
        assertThat(item.getQuantity()).isEqualTo(1);
        mvc.perform(get("/api/orders/my").with(user("deletion_customer").roles("USER")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.content[0].id").value(orderId))
                .andExpect(jsonPath("$.data.content[0].items[0].productName").value("Deletion regression deck"));
        assertThat(ids(data(get("/api/orders/admin/all").param("size", "1000")
                .with(user("admin").roles("ADMIN"))).path("content"))).contains(orderId);
    }

    @Test
    void deletedProductsCannotBeOrderedOrPaidForInAPendingOrder() throws Exception {
        long orderId = createOrder();
        long orderCount = orders.count();
        mvc.perform(delete("/api/products/" + product.getId()).with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk());
        entityManager.flush();
        entityManager.clear();

        mvc.perform(post("/api/orders").with(user("deletion_customer").roles("USER"))
                        .contentType("application/json").content(orderBody()))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/orders/" + orderId + "/pay").param("method", "ALIPAY")
                        .with(user("deletion_customer").roles("USER")))
                .andExpect(status().isConflict());
        entityManager.flush();
        entityManager.clear();
        assertThat(orders.count()).isEqualTo(orderCount);
        Order pending = orders.findById(orderId).orElseThrow();
        assertThat(pending.getStatus()).isEqualTo(Order.OrderStatus.PENDING);
        assertThat(pending.getPaymentId()).isNull();
        assertThat(pending.getPaidAt()).isNull();
        assertThat(products.findById(product.getId()).orElseThrow().getStock()).isEqualTo(10);
    }

    private long createOrder() throws Exception {
        return data(post("/api/orders").with(user("deletion_customer").roles("USER"))
                .contentType("application/json").content(orderBody())).path("id").asLong();
    }

    private String orderBody() {
        return "{\"items\":[{\"productId\":" + product.getId() + ",\"quantity\":1}],"
                + "\"paymentMethod\":\"ALIPAY\",\"shippingAddress\":\"Test address\","
                + "\"contactName\":\"Test customer\",\"contactPhone\":\"13800000000\"}";
    }

    private JsonNode data(MockHttpServletRequestBuilder request) throws Exception {
        return mapper.readTree(mvc.perform(request).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString()).path("data");
    }

    private List<Long> ids(JsonNode entries) {
        List<Long> ids = new ArrayList<>();
        entries.forEach(entry -> ids.add(entry.path("id").asLong()));
        return ids;
    }
}
