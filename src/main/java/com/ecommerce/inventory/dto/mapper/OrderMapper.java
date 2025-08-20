package com.ecommerce.inventory.dto.mapper;

import com.ecommerce.inventory.dto.request.OrderCreateRequest;
import com.ecommerce.inventory.dto.request.OrderUpdateRequest;
import com.ecommerce.inventory.dto.response.OrderResponse;
import com.ecommerce.inventory.dto.response.OrderSummaryResponse;
import com.ecommerce.inventory.entity.Order;
import com.ecommerce.inventory.entity.OrderItem;
import org.mapstruct.*;

import java.util.List;

/**
 * MapStruct mapper for Order entity and DTOs
 */
@Mapper(
    config = MapperConfig.class,
    uses = {OrderItemMapper.class, UserMapper.class}
)
public interface OrderMapper {

    @Mapping(target = "orderItems", source = "orderItems")
    @Mapping(target = "createdByName", source = "createdBy.fullName")
    @Mapping(target = "createdById", source = "createdBy.id")
    @Mapping(target = "totalQuantity", expression = "java(order.getTotalQuantity())")
    @Mapping(target = "itemCount", expression = "java(order.getItemCount())")
    @Mapping(target = "canBeCancelled", expression = "java(order.canBeCancelled())")
    @Mapping(target = "canBeModified", expression = "java(order.canBeModified())")
    @Mapping(target = "isActive", expression = "java(order.isActive())")
    OrderResponse toResponse(Order order);

    List<OrderResponse> toResponseList(List<Order> orders);

    @Mapping(target = "totalQuantity", expression = "java(order.getTotalQuantity())")
    @Mapping(target = "itemCount", expression = "java(order.getItemCount())")
    @Mapping(target = "createdByName", source = "createdBy.fullName")
    @Mapping(target = "createdById", source = "createdBy.id")
    OrderSummaryResponse toSummaryResponse(Order order);

    List<OrderSummaryResponse> toSummaryResponseList(List<Order> orders);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "orderNumber", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "subtotal", ignore = true)
    @Mapping(target = "totalAmount", ignore = true)
    @Mapping(target = "orderItems", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    Order toEntity(OrderCreateRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "orderNumber", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "subtotal", ignore = true)
    @Mapping(target = "totalAmount", ignore = true)
    @Mapping(target = "orderItems", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    void updateEntity(OrderUpdateRequest request, @MappingTarget Order order);

    @Named("toOrderReference")
    @Mapping(target = "orderItems", ignore = true)
    @Mapping(target = "createdByName", source = "createdBy.fullName")
    @Mapping(target = "createdById", source = "createdBy.id")
    @Mapping(target = "totalQuantity", expression = "java(order.getTotalQuantity())")
    @Mapping(target = "itemCount", expression = "java(order.getItemCount())")
    @Mapping(target = "canBeCancelled", ignore = true)
    @Mapping(target = "canBeModified", ignore = true)
    @Mapping(target = "isActive", ignore = true)
    OrderResponse toReferenceResponse(Order order);

    // Helper method to map OrderItem create requests
    default OrderItem mapOrderItemCreateRequest(OrderCreateRequest.OrderItemCreateRequest request) {
        if (request == null) {
            return null;
        }
        
        OrderItem orderItem = new OrderItem();
        orderItem.setQuantity(request.getQuantity());
        orderItem.setUnitPrice(request.getUnitPrice());
        orderItem.setNotes(request.getNotes());
        
        return orderItem;
    }
}