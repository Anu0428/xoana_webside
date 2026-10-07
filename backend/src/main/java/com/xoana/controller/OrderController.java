package com.xoana.controller;

import com.xoana.dto.ApiResponse;
import com.xoana.dto.CreateOrderRequest;
import com.xoana.model.Order;
import com.xoana.model.OrderItem;
import com.xoana.model.Product;
import com.xoana.model.User;
import com.xoana.repository.OrderRepository;
import com.xoana.repository.ProductRepository;
import com.xoana.repository.SiteSettingsRepository;
import com.xoana.repository.UserRepository;
import jakarta.validation.Valid;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.persistence.PersistenceContext;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final SiteSettingsRepository siteSettingsRepository;

    @PersistenceContext
    private EntityManager entityManager;

    public OrderController(OrderRepository orderRepository, ProductRepository productRepository,
                           UserRepository userRepository, SiteSettingsRepository siteSettingsRepository) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
        this.siteSettingsRepository = siteSettingsRepository;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Order>> createOrder(@Valid @RequestBody CreateOrderRequest request,
                                                          Authentication auth) {
        if (!isCheckoutEnabled()) {
            return ResponseEntity.status(409).body(ApiResponse.error("在线结账暂未开放，请联系商家购买"));
        }
        User user = userRepository.findByUsername(auth.getName()).orElseThrow();
        List<OrderItem> items = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;
        Map<Long, Long> quantities = new HashMap<>();

        Order order = Order.builder()
                .orderNo("XO" + UUID.randomUUID().toString().replace("-", ""))
                .user(user)
                .shippingAddress(request.getShippingAddress())
                .contactName(request.getContactName())
                .contactPhone(request.getContactPhone())
                .paymentMethod(request.getPaymentMethod())
                .remark(request.getRemark())
                .status(Order.OrderStatus.PENDING)
                .build();

        for (CreateOrderRequest.OrderItemRequest itemReq : request.getItems()) {
            Product product = productRepository.findById(itemReq.getProductId())
                    .filter(p -> p.getDeletedAt() == null)
                    .filter(Product::isActive).orElse(null);
            if (product == null) {
                return ResponseEntity.badRequest().body(ApiResponse.error("商品不存在或已下架"));
            }
            long quantity = quantities.merge(product.getId(), itemReq.getQuantity().longValue(), Long::sum);
            if (quantity > product.getStock()) {
                return ResponseEntity.status(409).body(ApiResponse.error("商品库存不足"));
            }
            BigDecimal itemTotal = product.getPrice().multiply(BigDecimal.valueOf(itemReq.getQuantity()));
            OrderItem item = OrderItem.builder()
                    .order(order)
                    .product(product)
                    .productName(product.getName())
                    .productImage(product.getCoverImage())
                    .quantity(itemReq.getQuantity())
                    .unitPrice(product.getPrice())
                    .totalPrice(itemTotal)
                    .build();
            items.add(item);
            total = total.add(itemTotal);
            if (total.compareTo(new BigDecimal("99999999.99")) > 0) {
                return ResponseEntity.badRequest().body(ApiResponse.error("订单金额超出支持范围，请拆分订单"));
            }
        }

        order.setItems(items);
        order.setTotalAmount(total);
        return ResponseEntity.ok(ApiResponse.success(orderRepository.save(order)));
    }

    @GetMapping("/my")
    public ResponseEntity<ApiResponse<Page<Order>>> getMyOrders(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication auth) {
        User user = userRepository.findByUsername(auth.getName()).orElseThrow();
        PageRequest pageable = Pagination.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(ApiResponse.success(orderRepository.findByUserId(user.getId(), pageable)));
    }

    @GetMapping("/admin/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Page<Order>>> getAllOrders(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        PageRequest pageable = Pagination.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(ApiResponse.success(orderRepository.findAll(pageable)));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<ApiResponse<Order>> updateOrderStatus(@PathVariable Long id,
                                                                 @RequestParam Order.OrderStatus status) {
        return orderRepository.findByIdForUpdate(id)
                .map(order -> {
                    if (order.getStatus() == status) {
                        return ResponseEntity.ok(ApiResponse.success(order));
                    }
                    if (!canTransition(order.getStatus(), status)) {
                        return ResponseEntity.status(409).body(ApiResponse.<Order>error("当前订单状态不能变更为该状态"));
                    }
                    if (order.getStatus() == Order.OrderStatus.PAID && status == Order.OrderStatus.REFUNDED) {
                        Map<Long, Long> quantities = new HashMap<>();
                        for (OrderItem item : order.getItems()) {
                            if (item.getProduct() == null) {
                                return ResponseEntity.status(409).body(ApiResponse.<Order>error("订单商品不存在，无法恢复库存"));
                            }
                            quantities.merge(item.getProduct().getId(), item.getQuantity().longValue(), Long::sum);
                        }
                        Map<Long, Product> lockedProducts = new HashMap<>();
                        for (Long productId : quantities.keySet().stream().sorted().toList()) {
                            Product product = productRepository.findById(productId).orElse(null);
                            if (product == null) {
                                return ResponseEntity.status(409).body(ApiResponse.<Order>error("订单商品不存在，无法恢复库存"));
                            }
                            entityManager.refresh(product, LockModeType.PESSIMISTIC_WRITE);
                            if ((long) product.getStock() + quantities.get(productId) > Integer.MAX_VALUE) {
                                return ResponseEntity.status(409).body(ApiResponse.<Order>error("库存超出支持范围"));
                            }
                            lockedProducts.put(productId, product);
                        }
                        for (Map.Entry<Long, Product> entry : lockedProducts.entrySet()) {
                            Product product = entry.getValue();
                            product.setStock(product.getStock() + quantities.get(entry.getKey()).intValue());
                        }
                    }
                    order.setStatus(status);
                    order.setUpdatedAt(LocalDateTime.now());
                    return ResponseEntity.ok(ApiResponse.success(orderRepository.save(order)));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // Mock payment endpoint for testing
    @PostMapping("/{id}/pay")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> processPayment(@PathVariable Long id,
                                                              @RequestParam Order.PaymentMethod method,
                                                              Authentication auth) {
        if (!isCheckoutEnabled()) {
            return ResponseEntity.status(409).body(ApiResponse.error("在线结账暂未开放，请联系商家购买"));
        }
        User user = userRepository.findByUsername(auth.getName()).orElseThrow();
        Order order = orderRepository.findByIdAndUserId(id, user.getId()).orElse(null);
        if (order == null) {
            return ResponseEntity.notFound().build();
        }
        if (order.getStatus() != Order.OrderStatus.PENDING && order.getStatus() != Order.OrderStatus.PAID) {
            return ResponseEntity.status(409).body(ApiResponse.error("当前订单状态不能支付"));
        }
        // Repeat requests reuse the original payment rather than issuing another one.
        if (order.getStatus() == Order.OrderStatus.PENDING) {
            Map<Long, Long> quantities = new HashMap<>();
            for (OrderItem item : order.getItems()) {
                if (item.getProduct() == null) {
                    return ResponseEntity.status(409).body(ApiResponse.error("订单商品不存在"));
                }
                quantities.merge(item.getProduct().getId(), item.getQuantity().longValue(), Long::sum);
            }
            Map<Long, Product> lockedProducts = new HashMap<>();
            // Lock products in a stable order to avoid deadlocks between overlapping carts.
            for (Long productId : quantities.keySet().stream().sorted().toList()) {
                Product product = productRepository.findById(productId).orElse(null);
                if (product == null) {
                    return ResponseEntity.status(409).body(ApiResponse.error("订单商品不存在"));
                }
                // Refresh also avoids stale stock already loaded with the order's eager items.
                entityManager.refresh(product, LockModeType.PESSIMISTIC_WRITE);
                if (product.getDeletedAt() != null || !product.isActive() || quantities.get(productId) > product.getStock()) {
                    return ResponseEntity.status(409).body(ApiResponse.error("商品已下架或库存不足"));
                }
                lockedProducts.put(productId, product);
            }
            for (Map.Entry<Long, Product> entry : lockedProducts.entrySet()) {
                Product product = entry.getValue();
                product.setStock(product.getStock() - quantities.get(entry.getKey()).intValue());
            }
            order.setStatus(Order.OrderStatus.PAID);
            order.setPaidAt(LocalDateTime.now());
            order.setUpdatedAt(LocalDateTime.now());
            order.setPaymentMethod(method);
            order.setPaymentId("MOCK_" + UUID.randomUUID().toString().replace("-", "").toUpperCase());
            orderRepository.save(order);
        }
        Map<String, Object> result = new HashMap<>();
        result.put("orderId", order.getId());
        result.put("orderNo", order.getOrderNo());
        result.put("paymentId", order.getPaymentId());
        result.put("status", order.getStatus().name());
        result.put("message", "测试支付成功，生产环境请接入真实支付网关");
        return ResponseEntity.ok(ApiResponse.success("支付成功（测试模式）", result));
    }

    private boolean isCheckoutEnabled() {
        return siteSettingsRepository.findById(1L).map(settings -> settings.isCheckoutEnabled()).orElse(true);
    }

    private boolean canTransition(Order.OrderStatus current, Order.OrderStatus next) {
        return switch (current) {
            case PENDING -> next == Order.OrderStatus.CANCELLED;
            case PAID -> next == Order.OrderStatus.SHIPPED || next == Order.OrderStatus.REFUNDED;
            case SHIPPED -> next == Order.OrderStatus.DELIVERED || next == Order.OrderStatus.REFUNDED;
            case DELIVERED -> next == Order.OrderStatus.REFUNDED;
            case CANCELLED, REFUNDED -> false;
        };
    }
}
