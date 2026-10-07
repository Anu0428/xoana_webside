package com.xoana.dto;

import com.xoana.model.Order;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Data;
import java.util.List;

@Data
public class CreateOrderRequest {
    @NotEmpty
    @Valid
    private List<@NotNull OrderItemRequest> items;
    @Size(max = 500)
    @NotBlank
    private String shippingAddress;
    @Size(max = 100)
    @NotBlank
    private String contactName;
    @Size(max = 20)
    @NotBlank
    private String contactPhone;
    @NotNull
    private Order.PaymentMethod paymentMethod;
    @Size(max = 500)
    private String remark;

    @Data
    public static class OrderItemRequest {
        @NotNull
        @Positive
        private Long productId;
        @NotNull
        @Positive
        private Integer quantity;
    }
}
