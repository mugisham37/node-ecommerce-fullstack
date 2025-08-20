package com.ecommerce.inventory.dto.request;

import com.ecommerce.inventory.dto.validation.ValidationGroups;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

/**
 * Request DTO for bulk product updates
 */
@Data
public class BulkProductUpdateRequest {

    @NotNull(message = "Product updates are required", groups = ValidationGroups.Bulk.class)
    @NotEmpty(message = "At least one product update is required", groups = ValidationGroups.Bulk.class)
    @Size(max = 100, message = "Cannot update more than 100 products at once", groups = ValidationGroups.Bulk.class)
    @Valid
    private List<ProductUpdateItem> productUpdates;

    @Size(max = 500, message = "Reason must not exceed 500 characters", groups = ValidationGroups.Bulk.class)
    private String reason;

    @Data
    public static class ProductUpdateItem {

        @NotNull(message = "Product ID is required", groups = ValidationGroups.Bulk.class)
        @Positive(message = "Product ID must be positive", groups = ValidationGroups.Bulk.class)
        private Long productId;

        @Size(max = 200, message = "Product name must not exceed 200 characters", groups = ValidationGroups.Update.class)
        private String name;

        @DecimalMin(value = "0.01", message = "Cost price must be greater than 0", groups = ValidationGroups.Update.class)
        @Digits(integer = 8, fraction = 2, message = "Cost price must have at most 8 integer digits and 2 decimal places", groups = ValidationGroups.Update.class)
        private BigDecimal costPrice;

        @DecimalMin(value = "0.01", message = "Selling price must be greater than 0", groups = ValidationGroups.Update.class)
        @Digits(integer = 8, fraction = 2, message = "Selling price must have at most 8 integer digits and 2 decimal places", groups = ValidationGroups.Update.class)
        private BigDecimal sellingPrice;

        @Min(value = 0, message = "Reorder level must be non-negative", groups = ValidationGroups.Update.class)
        private Integer reorderLevel;

        @Min(value = 1, message = "Reorder quantity must be positive", groups = ValidationGroups.Update.class)
        private Integer reorderQuantity;

        private Boolean active;

        @AssertTrue(message = "Selling price must be greater than or equal to cost price", groups = ValidationGroups.Update.class)
        public boolean isSellingPriceValid() {
            if (costPrice == null || sellingPrice == null) {
                return true;
            }
            return sellingPrice.compareTo(costPrice) >= 0;
        }
    }
}