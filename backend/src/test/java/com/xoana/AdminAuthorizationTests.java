package com.xoana;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.xoana.model.Article;
import com.xoana.model.Order;
import com.xoana.model.Product;
import com.xoana.model.User;
import com.xoana.repository.ArticleRepository;
import com.xoana.repository.OrderRepository;
import com.xoana.repository.ProductRepository;
import com.xoana.repository.UserRepository;
import com.xoana.security.JwtTokenProvider;
import com.xoana.security.UserDetailsServiceImpl;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:authorization;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa", "spring.datasource.password=",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "app.jwt.secret=authorization-tests-only-secret-at-least-32-bytes"
})
@ActiveProfiles("test")
@AutoConfigureMockMvc
@Transactional
class AdminAuthorizationTests {
    private static final String TEST_SECRET = "authorization-tests-only-secret-at-least-32-bytes";

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired UserRepository users;
    @Autowired ProductRepository products;
    @Autowired ArticleRepository articles;
    @Autowired OrderRepository orders;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired JwtTokenProvider tokens;
    @Autowired UserDetailsServiceImpl userDetails;

    private User admin;
    private User customer;
    private String adminToken;
    private String customerToken;

    @BeforeEach
    void createAccounts() {
        admin = createUser("auth_admin", User.Role.ADMIN);
        customer = createUser("auth_customer", User.Role.USER);
        adminToken = tokens.generateToken(userDetails.loadUserByUsername(admin.getUsername()));
        customerToken = tokens.generateToken(userDetails.loadUserByUsername(customer.getUsername()));
    }

    @ParameterizedTest
    @CsvSource({
            "GET,/api/admin/session", "POST,/api/admin/upload/image",
            "GET,/api/products/all", "POST,/api/products", "PUT,/api/products/1", "DELETE,/api/products/1",
            "GET,/api/articles/admin/all", "POST,/api/articles", "PUT,/api/articles/1", "DELETE,/api/articles/1",
            "PUT,/api/settings", "GET,/api/users/admin/all", "PUT,/api/users/admin/1/status",
            "GET,/api/orders/admin/all", "PUT,/api/orders/1/status",
            "GET,/api/contact", "PUT,/api/contact/1/read", "DELETE,/api/contact/1",
            "GET,/api/traffic/stats", "GET,/api/admin/future-management-route",
            "HEAD,/api/products/all", "HEAD,/api/articles/admin/all"
    })
    void administrativeRoutesRejectAnonymousAndOrdinaryUsersBeforeControllerBinding(String method, String path)
            throws Exception {
        mvc.perform(request(HttpMethod.valueOf(method), path))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.success").value(false));
        mvc.perform(request(HttpMethod.valueOf(method), path).header("Authorization", bearer(customerToken)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/products/all", "/api/articles/admin/all", "/api/users/admin/all",
            "/api/orders/admin/all", "/api/contact", "/api/traffic/stats"})
    void administratorCanReadManagementData(String path) throws Exception {
        mvc.perform(get(path).header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void sessionReturnsOnlyServerVerifiedSafeAccountFields() throws Exception {
        mvc.perform(get("/api/admin/session").header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.data.id").value(admin.getId()))
                .andExpect(jsonPath("$.data.username").value(admin.getUsername()))
                .andExpect(jsonPath("$.data.nickname").value("Admin authorization test"))
                .andExpect(jsonPath("$.data.email").value(admin.getEmail()))
                .andExpect(jsonPath("$.data.role").value("ADMIN"))
                .andExpect(jsonPath("$.data.password").doesNotExist())
                .andExpect(jsonPath("$.data.token").doesNotExist());
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "not-a-jwt", "a.b.c"})
    void missingOrMalformedTokensCannotEnterAdmin(String token) throws Exception {
        mvc.perform(get("/api/admin/session").header("Authorization", bearer(token)))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void expiredAndForgedTokensCannotEnterAdmin() throws Exception {
        String expired = signedToken(admin.getUsername(), TEST_SECRET, new Date(System.currentTimeMillis() - 1000), "ROLE_ADMIN");
        String forged = signedToken(admin.getUsername(), "different-invalid-signing-key-at-least-32-bytes", future(), "ROLE_ADMIN");
        String legacy = signedToken(admin.getUsername(),
                "xoanaSecretKey2024VeryLongSecretKeyForJWTSigningThatIsAtLeast256BitsLong", future(), "ROLE_ADMIN");
        String missingExpiration = signedToken(admin.getUsername(), TEST_SECRET, null, "ROLE_ADMIN");
        String missingSubject = signedToken(null, TEST_SECRET, future(), "ROLE_ADMIN");
        for (String token : List.of(expired, forged, legacy, missingExpiration, missingSubject)) {
            mvc.perform(get("/api/admin/session").header("Authorization", bearer(token)))
                    .andExpect(status().isUnauthorized());
        }
        String[] parts = adminToken.split("\\.");
        String tampered = parts[0] + "." + parts[1].substring(0, parts[1].length() - 1) + "A." + parts[2];
        mvc.perform(get("/api/admin/session").header("Authorization", bearer(tampered)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void permissionsAreLoadedFromDatabaseInsteadOfTrustedJwtClaims() throws Exception {
        String claimingAdmin = signedToken(customer.getUsername(), TEST_SECRET, future(), "ROLE_ADMIN");
        mvc.perform(get("/api/admin/session").header("Authorization", bearer(claimingAdmin)))
                .andExpect(status().isForbidden());
        admin.setRole(User.Role.USER);
        users.saveAndFlush(admin);
        mvc.perform(get("/api/admin/session").header("Authorization", bearer(adminToken)))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/users/me").header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.role").value("USER"));
    }

    @Test
    void disablingAnAdministratorInvalidatesExistingTokenImmediately() throws Exception {
        admin.setEnabled(false);
        users.saveAndFlush(admin);
        mvc.perform(get("/api/admin/session").header("Authorization", bearer(adminToken)))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/users/me").header("Authorization", bearer(adminToken)))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"auth_admin\",\"password\":\"auth-test-password\"}"))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void deletingAnAdministratorInvalidatesExistingToken() throws Exception {
        users.delete(admin);
        users.flush();
        mvc.perform(get("/api/admin/session").header("Authorization", bearer(adminToken)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void uploadOnlyReachesTheControllerForAdministrators() throws Exception {
        MockMultipartFile image = new MockMultipartFile("file", "test.png", "image/png", new byte[0]);
        mvc.perform(multipart("/api/admin/upload/image").file(image))
                .andExpect(status().isUnauthorized());
        mvc.perform(multipart("/api/admin/upload/image").file(image).header("Authorization", bearer(customerToken)))
                .andExpect(status().isForbidden());
        // An empty upload proves ADMIN reaches the existing validation without writing a file.
        mvc.perform(multipart("/api/admin/upload/image").file(image).header("Authorization", bearer(adminToken)))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").value("文件为空"));
    }

    @Test
    void administratorsCanCreateUpdateAndDeleteProductsAndArticles() throws Exception {
        JsonNode createdProduct = responseData(mvc.perform(post("/api/products").header("Authorization", bearer(adminToken))
                .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Admin product\",\"price\":12.5}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        long productId = createdProduct.get("id").asLong();
        mvc.perform(put("/api/products/" + productId).header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Updated product\",\"price\":15}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.name").value("Updated product"));
        mvc.perform(delete("/api/products/" + productId).header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk());
        assertThat(products.findById(productId).orElseThrow().isActive()).isFalse();

        long articleId = responseData(mvc.perform(post("/api/articles").header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"Admin article\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).get("id").asLong();
        mvc.perform(put("/api/articles/" + articleId).header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"Updated article\",\"published\":true}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.published").value(true));
        mvc.perform(delete("/api/articles/" + articleId).header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk());
        assertThat(articles.existsById(articleId)).isFalse();
    }

    @Test
    void administratorCanManageSettingsAccountsOrdersAndMessages() throws Exception {
        mvc.perform(put("/api/settings").header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"siteName\":\"Authorization test\"}"))
                .andExpect(status().isOk());
        mvc.perform(put("/api/users/admin/" + customer.getId() + "/status").header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.enabled").value(false))
                .andExpect(jsonPath("$.data.password").doesNotExist());
        Order order = orders.saveAndFlush(Order.builder().orderNo("authorization-admin-order")
                .user(customer).totalAmount(BigDecimal.TEN).status(Order.OrderStatus.PAID).build());
        mvc.perform(put("/api/orders/" + order.getId() + "/status").param("status", "SHIPPED")
                        .header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.status").value("SHIPPED"))
                .andExpect(jsonPath("$.data.user.password").doesNotExist());
        mvc.perform(put("/api/contact/999999/read").header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk());
        mvc.perform(delete("/api/contact/999999").header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk());
    }

    @Test
    void publicReadAndCustomerFlowsRemainAvailableWithoutAdministrativeAccess() throws Exception {
        Product product = products.saveAndFlush(Product.builder().name("Public product").price(BigDecimal.TEN).stock(10).build());
        Article article = articles.saveAndFlush(Article.builder().title("Public article").published(true).build());
        for (String path : List.of("/api/products", "/api/products/featured", "/api/products/" + product.getId(),
                "/api/articles", "/api/articles/recent", "/api/articles/" + article.getId(), "/api/settings")) {
            mvc.perform(get(path)).andExpect(status().isOk());
        }
        mvc.perform(post("/api/traffic/track").contentType(MediaType.APPLICATION_JSON).content("{\"path\":\"/\"}"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/users/me").header("Authorization", bearer(customerToken)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.password").doesNotExist());
        mvc.perform(put("/api/users/me").header("Authorization", bearer(customerToken))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"nickname\":\"Customer\",\"role\":\"ADMIN\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.role").value("USER"));
        mvc.perform(get("/api/orders/my").header("Authorization", bearer(customerToken)))
                .andExpect(status().isOk());
        mvc.perform(post("/api/contact").header("Authorization", bearer(customerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Customer\",\"email\":\"customer@example.com\",\"message\":\"Hello\"}"))
                .andExpect(status().isOk());
        String orderBody = "{\"items\":[{\"productId\":" + product.getId() + ",\"quantity\":1}],\"paymentMethod\":\"ALIPAY\","
                + "\"shippingAddress\":\"Test address\",\"contactName\":\"Customer\",\"contactPhone\":\"13800000000\"}";
        long orderId = responseData(mvc.perform(post("/api/orders").header("Authorization", bearer(customerToken))
                        .contentType(MediaType.APPLICATION_JSON).content(orderBody))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.user.password").doesNotExist())
                .andReturn().getResponse().getContentAsString()).get("id").asLong();
        mvc.perform(post("/api/orders/" + orderId + "/pay").param("method", "ALIPAY")
                        .header("Authorization", bearer(customerToken)))
                .andExpect(status().isOk());
    }

    @Test
    void registrationCannotAssignAdministratorRoleAndLoginUsesValidCredentials() throws Exception {
        JsonNode registered = responseData(mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"self_registered\",\"email\":\"self@example.com\",\"password\":\"test-password\",\"role\":\"ADMIN\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.role").value("USER"))
                .andReturn().getResponse().getContentAsString());
        mvc.perform(get("/api/admin/session").header("Authorization", bearer(registered.get("token").asText())))
                .andExpect(status().isForbidden());
        JsonNode login = responseData(mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"auth_admin\",\"password\":\"auth-test-password\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        mvc.perform(get("/api/admin/session").header("Authorization", bearer(login.get("token").asText())))
                .andExpect(status().isOk());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"auth_admin\",\"password\":\"wrong-password\"}"))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.success").value(false));
    }

    private User createUser(String username, User.Role role) {
        return users.saveAndFlush(User.builder().username(username).email(username + "@example.com")
                .nickname("Admin authorization test").password(passwordEncoder.encode("auth-test-password"))
                .role(role).enabled(true).build());
    }

    private JsonNode responseData(String body) throws Exception {
        return mapper.readTree(body).get("data");
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }

    private static Date future() {
        return new Date(System.currentTimeMillis() + 60000);
    }

    private static String signedToken(String subject, String secret, Date expiration, String authority) {
        return Jwts.builder().setSubject(subject).claim("authorities", List.of(authority))
                .setExpiration(expiration).signWith(Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8)),
                        SignatureAlgorithm.HS256).compact();
    }
}
