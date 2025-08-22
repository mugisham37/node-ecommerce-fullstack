import {
  batchLoyaltyPointsSchema,
  sendLoyaltyNotificationSchema,
  createABTestSchema,
  trackConversionSchema,
  exportQuerySchemas,
  paginationSchema,
  dateRangeSchema,
} from '../validation-schemas';

describe('Validation Schemas', () => {
  describe('batchLoyaltyPointsSchema', () => {
    it('should validate correct batch loyalty points data', () => {
      const validData = {
        operations: [
          {
            userId: '123e4567-e89b-12d3-a456-426614174000',
            points: 100,
            description: 'Purchase reward',
            type: 'order' as const,
          },
        ],
      };

      const result = batchLoyaltyPointsSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid data', () => {
      const invalidData = {
        operations: [],
      };

      const result = batchLoyaltyPointsSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('sendLoyaltyNotificationSchema', () => {
    it('should validate correct notification data', () => {
      const validData = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        type: 'points_earned' as const,
        data: { points: 100 },
      };

      const result = sendLoyaltyNotificationSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid notification type', () => {
      const invalidData = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        type: 'invalid_type',
        data: {},
      };

      const result = sendLoyaltyNotificationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('createABTestSchema', () => {
    it('should validate correct A/B test data', () => {
      const validData = {
        name: 'Test Campaign',
        description: 'Testing new feature',
        variants: [
          { name: 'Control', weight: 50 },
          { name: 'Treatment', weight: 50 },
        ],
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-31'),
      };

      const result = createABTestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject test with less than 2 variants', () => {
      const invalidData = {
        name: 'Test Campaign',
        variants: [{ name: 'Control', weight: 100 }],
      };

      const result = createABTestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject test with end date before start date', () => {
      const invalidData = {
        name: 'Test Campaign',
        variants: [
          { name: 'Control', weight: 50 },
          { name: 'Treatment', weight: 50 },
        ],
        startDate: new Date('2023-01-31'),
        endDate: new Date('2023-01-01'),
      };

      const result = createABTestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('trackConversionSchema', () => {
    it('should validate correct conversion data', () => {
      const validData = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        conversionType: 'purchase',
        value: 99.99,
        metadata: { productId: 'prod-123' },
      };

      const result = trackConversionSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should allow optional fields', () => {
      const validData = {
        conversionType: 'signup',
      };

      const result = trackConversionSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('exportQuerySchemas', () => {
    describe('orders', () => {
      it('should validate correct orders export query', () => {
        const validData = {
          format: 'csv' as const,
          startDate: '2023-01-01T00:00:00Z',
          endDate: '2023-01-31T23:59:59Z',
          status: 'completed' as const,
        };

        const result = exportQuerySchemas.orders.safeParse(validData);
        expect(result.success).toBe(true);
      });

      it('should reject invalid date range', () => {
        const invalidData = {
          startDate: '2023-01-31T00:00:00Z',
          endDate: '2023-01-01T00:00:00Z',
        };

        const result = exportQuerySchemas.orders.safeParse(invalidData);
        expect(result.success).toBe(false);
      });
    });

    describe('products', () => {
      it('should validate correct products export query', () => {
        const validData = {
          format: 'excel' as const,
          minPrice: 10,
          maxPrice: 100,
          inStock: 'true' as const,
        };

        const result = exportQuerySchemas.products.safeParse(validData);
        expect(result.success).toBe(true);
      });

      it('should reject invalid price range', () => {
        const invalidData = {
          minPrice: 100,
          maxPrice: 10,
        };

        const result = exportQuerySchemas.products.safeParse(invalidData);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('paginationSchema', () => {
    it('should validate correct pagination data', () => {
      const validData = { page: 2, limit: 50 };
      const result = paginationSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should use default values', () => {
      const result = paginationSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    it('should reject invalid pagination', () => {
      const invalidData = { page: 0, limit: 101 };
      const result = paginationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('dateRangeSchema', () => {
    it('should validate correct date range', () => {
      const validData = {
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-31'),
      };

      const result = dateRangeSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid date range', () => {
      const invalidData = {
        startDate: new Date('2023-01-31'),
        endDate: new Date('2023-01-01'),
      };

      const result = dateRangeSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});