import { eq, and, or, desc, asc, sql, gte, lte, inArray } from 'drizzle-orm';
import { 
  abTests, 
  abTestVariants, 
  userTestAssignments, 
  abTestEvents, 
  abTestConversions,
  abTestSegments,
  ABTest,
  NewABTest,
  ABTestVariant,
  NewABTestVariant,
  UserTestAssignment,
  NewUserTestAssignment,
  ABTestEvent,
  NewABTestEvent,
  ABTestConversion,
  NewABTestConversion,
  ABTestSegment,
  NewABTestSegment,
  ABTestStatus,
  ABTestEventType,
  ConversionType
} from '../schema/ab-tests';
import { BaseRepository, FilterOptions, PaginationOptions, PagedResult } from './base/base-repository';
import { DatabaseConnection } from '../connection';

export interface ABTestFilters extends FilterOptions {
  name?: string;
  type?: string;
  status?: string;
  createdBy?: string;
  search?: string;
}

export interface AssignmentFilters extends FilterOptions {
  userId?: string;
  testId?: string;
  variantId?: string;
  sessionId?: string;
}

export interface ABTestWithVariants extends ABTest {
  variants?: ABTestVariant[];
  totalAssignments?: number;
  totalConversions?: number;
}

export interface TestResults {
  testId: string;
  variants: Array<{
    variantId: string;
    variantName: string;
    assignments: number;
    conversions: number;
    conversionRate: number;
    revenue: number;
    averageRevenue: number;
    confidenceInterval?: {
      lower: number;
      upper: number;
    };
  }>;
  winner?: string;
  statisticalSignificance?: number;
}

/**
 * Repository for A/B tests
 */
export class ABTestRepository extends BaseRepository<
  typeof abTests,
  ABTest,
  NewABTest
> {
  protected table = abTests;
  protected tableName = 'ab_tests';

  constructor(db: DatabaseConnection) {
    super(db, {
      enableSoftDelete: false,
      timestampFields: {
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
      },
    });
  }

  /**
   * Find active tests
   */
  async findActiveTests(): Promise<ABTest[]> {
    return await this.findBy({ status: ABTestStatus.RUNNING });
  }

  /**
   * Find test with variants
   */
  async findTestWithVariants(testId: string): Promise<ABTestWithVariants | null> {
    const test = await this.findById(testId);
    if (!test) return null;

    return await this.executeKyselyQuery(async (db) => {
      const variants = await db
        .selectFrom('ab_test_variants')
        .selectAll()
        .where('test_id', '=', testId)
        .orderBy('created_at', 'asc')
        .execute();

      const stats = await db
        .selectFrom('user_test_assignments')
        .select([
          db.fn.count('id').as('totalAssignments'),
          db.fn.sum('conversions').as('totalConversions'),
        ])
        .where('test_id', '=', testId)
        .executeTakeFirst();

      return {
        ...test,
        variants: variants.map(v => ({
          id: v.id,
          testId: v.test_id,
          name: v.name,
          description: v.description,
          isControl: v.is_control,
          trafficAllocation: v.traffic_allocation,
          configuration: v.configuration,
          createdAt: v.created_at,
          updatedAt: v.updated_at,
        })),
        totalAssignments: Number(stats?.totalAssignments) || 0,
        totalConversions: Number(stats?.totalConversions) || 0,
      } as ABTestWithVariants;
    });
  }

  /**
   * Search tests with filters
   */
  async searchTests(
    filters: ABTestFilters,
    pagination: PaginationOptions = { page: 1, limit: 10 }
  ): Promise<PagedResult<ABTest>> {
    if (filters.search) {
      return await this.search(
        {
          query: filters.search,
          searchFields: ['name', 'description'],
        },
        pagination,
        { 
          status: filters.status,
          type: filters.type,
          createdBy: filters.createdBy 
        }
      );
    }

    return await this.findAll(pagination, filters);
  }
}/**
 * 
Repository for A/B test variants
 */
export class ABTestVariantRepository extends BaseRepository<
  typeof abTestVariants,
  ABTestVariant,
  NewABTestVariant
> {
  protected table = abTestVariants;
  protected tableName = 'ab_test_variants';

  constructor(db: DatabaseConnection) {
    super(db, {
      enableSoftDelete: false,
      timestampFields: {
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
      },
    });
  }

  /**
   * Find variants by test ID
   */
  async findByTestId(testId: string): Promise<ABTestVariant[]> {
    return await this.findBy({ testId });
  }

  /**
   * Find control variant
   */
  async findControlVariant(testId: string): Promise<ABTestVariant | null> {
    return await this.findOneBy({ testId, isControl: true });
  }

  /**
   * Get variant for assignment based on traffic allocation
   */
  async getVariantForAssignment(testId: string): Promise<ABTestVariant | null> {
    return await this.executeKyselyQuery(async (db) => {
      const variants = await db
        .selectFrom('ab_test_variants')
        .selectAll()
        .where('test_id', '=', testId)
        .orderBy('created_at', 'asc')
        .execute();

      if (variants.length === 0) return null;

      // Simple random assignment based on traffic allocation
      const random = Math.random() * 100;
      let cumulative = 0;

      for (const variant of variants) {
        cumulative += Number(variant.traffic_allocation);
        if (random <= cumulative) {
          return {
            id: variant.id,
            testId: variant.test_id,
            name: variant.name,
            description: variant.description,
            isControl: variant.is_control,
            trafficAllocation: variant.traffic_allocation,
            configuration: variant.configuration,
            createdAt: variant.created_at,
            updatedAt: variant.updated_at,
          } as ABTestVariant;
        }
      }

      // Fallback to first variant
      const firstVariant = variants[0];
      return {
        id: firstVariant.id,
        testId: firstVariant.test_id,
        name: firstVariant.name,
        description: firstVariant.description,
        isControl: firstVariant.is_control,
        trafficAllocation: firstVariant.traffic_allocation,
        configuration: firstVariant.configuration,
        createdAt: firstVariant.created_at,
        updatedAt: firstVariant.updated_at,
      } as ABTestVariant;
    });
  }
}

/**
 * Repository for user test assignments
 */
export class UserTestAssignmentRepository extends BaseRepository<
  typeof userTestAssignments,
  UserTestAssignment,
  NewUserTestAssignment
> {
  protected table = userTestAssignments;
  protected tableName = 'user_test_assignments';

  constructor(db: DatabaseConnection) {
    super(db, {
      enableSoftDelete: false,
      timestampFields: {
        createdAt: 'assignedAt',
      },
    });
  }

  /**
   * Find assignment by user and test
   */
  async findByUserAndTest(userId: string, testId: string): Promise<UserTestAssignment | null> {
    return await this.findOneBy({ userId, testId });
  }

  /**
   * Find assignment by session and test
   */
  async findBySessionAndTest(sessionId: string, testId: string): Promise<UserTestAssignment | null> {
    return await this.findOneBy({ sessionId, testId });
  }

  /**
   * Create or get assignment
   */
  async createOrGetAssignment(data: {
    userId?: string;
    sessionId?: string;
    testId: string;
    variantId: string;
  }): Promise<UserTestAssignment> {
    // Try to find existing assignment
    let existing: UserTestAssignment | null = null;
    
    if (data.userId) {
      existing = await this.findByUserAndTest(data.userId, data.testId);
    } else if (data.sessionId) {
      existing = await this.findBySessionAndTest(data.sessionId, data.testId);
    }

    if (existing) {
      return existing;
    }

    // Create new assignment
    return await this.create(data as NewUserTestAssignment);
  }

  /**
   * Record impression
   */
  async recordImpression(assignmentId: string): Promise<void> {
    await this.executeKyselyQuery(async (db) => {
      await db
        .updateTable('user_test_assignments')
        .set({
          impressions: sql`impressions + 1`,
          first_exposure: sql`COALESCE(first_exposure, NOW())`,
          last_activity: new Date(),
        })
        .where('id', '=', assignmentId)
        .execute();
    });
  }

  /**
   * Record conversion
   */
  async recordConversion(assignmentId: string, revenue: number = 0): Promise<void> {
    await this.executeKyselyQuery(async (db) => {
      await db
        .updateTable('user_test_assignments')
        .set({
          conversions: sql`conversions + 1`,
          revenue: sql`revenue + ${revenue}`,
          last_activity: new Date(),
        })
        .where('id', '=', assignmentId)
        .execute();
    });
  }

  /**
   * Record engagement
   */
  async recordEngagement(assignmentId: string): Promise<void> {
    await this.executeKyselyQuery(async (db) => {
      await db
        .updateTable('user_test_assignments')
        .set({
          engagements: sql`engagements + 1`,
          last_activity: new Date(),
        })
        .where('id', '=', assignmentId)
        .execute();
    });
  }
}

/**
 * Repository for A/B test events
 */
export class ABTestEventRepository extends BaseRepository<
  typeof abTestEvents,
  ABTestEvent,
  NewABTestEvent
> {
  protected table = abTestEvents;
  protected tableName = 'ab_test_events';

  constructor(db: DatabaseConnection) {
    super(db, {
      enableSoftDelete: false,
      timestampFields: {
        createdAt: 'timestamp',
      },
    });
  }

  /**
   * Record event
   */
  async recordEvent(data: {
    testId: string;
    variantId: string;
    userId?: string;
    sessionId?: string;
    eventType: string;
    eventName?: string;
    eventValue?: number;
    eventData?: any;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<ABTestEvent> {
    return await this.create(data as NewABTestEvent);
  }

  /**
   * Get events by test
   */
  async getEventsByTest(
    testId: string,
    eventType?: string,
    pagination: PaginationOptions = { page: 1, limit: 100 }
  ): Promise<PagedResult<ABTestEvent>> {
    const filters: FilterOptions = { testId };
    if (eventType) filters.eventType = eventType;
    
    return await this.findAll(pagination, filters);
  }
}

/**
 * Repository for A/B test conversions
 */
export class ABTestConversionRepository extends BaseRepository<
  typeof abTestConversions,
  ABTestConversion,
  NewABTestConversion
> {
  protected table = abTestConversions;
  protected tableName = 'ab_test_conversions';

  constructor(db: DatabaseConnection) {
    super(db, {
      enableSoftDelete: false,
      timestampFields: {
        createdAt: 'timestamp',
      },
    });
  }

  /**
   * Record conversion
   */
  async recordConversion(data: {
    testId: string;
    variantId: string;
    userId?: string;
    sessionId?: string;
    conversionType: string;
    conversionValue?: number;
    orderId?: string;
    conversionData?: any;
  }): Promise<ABTestConversion> {
    return await this.create(data as NewABTestConversion);
  }

  /**
   * Get conversion stats by test
   */
  async getConversionStatsByTest(testId: string): Promise<{
    totalConversions: number;
    totalValue: number;
    conversionsByVariant: Array<{
      variantId: string;
      variantName: string;
      conversions: number;
      value: number;
    }>;
  }> {
    return await this.executeKyselyQuery(async (db) => {
      const totalStats = await db
        .selectFrom('ab_test_conversions')
        .select([
          db.fn.count('id').as('totalConversions'),
          db.fn.sum('conversion_value').as('totalValue'),
        ])
        .where('test_id', '=', testId)
        .executeTakeFirst();

      const variantStats = await db
        .selectFrom('ab_test_conversions')
        .innerJoin('ab_test_variants', 'ab_test_conversions.variant_id', 'ab_test_variants.id')
        .select([
          'ab_test_conversions.variant_id as variantId',
          'ab_test_variants.name as variantName',
          db.fn.count('ab_test_conversions.id').as('conversions'),
          db.fn.sum('ab_test_conversions.conversion_value').as('value'),
        ])
        .where('ab_test_conversions.test_id', '=', testId)
        .groupBy(['ab_test_conversions.variant_id', 'ab_test_variants.name'])
        .execute();

      return {
        totalConversions: Number(totalStats?.totalConversions) || 0,
        totalValue: Number(totalStats?.totalValue) || 0,
        conversionsByVariant: variantStats.map(stat => ({
          variantId: stat.variantId,
          variantName: stat.variantName,
          conversions: Number(stat.conversions),
          value: Number(stat.value) || 0,
        })),
      };
    });
  }
}

/**
 * Repository for A/B test segments
 */
export class ABTestSegmentRepository extends BaseRepository<
  typeof abTestSegments,
  ABTestSegment,
  NewABTestSegment
> {
  protected table = abTestSegments;
  protected tableName = 'ab_test_segments';

  constructor(db: DatabaseConnection) {
    super(db, {
      enableSoftDelete: false,
      timestampFields: {
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
      },
    });
  }

  /**
   * Find active segments
   */
  async findActiveSegments(): Promise<ABTestSegment[]> {
    return await this.findBy({ isActive: true });
  }

  /**
   * Find segment by name
   */
  async findByName(name: string): Promise<ABTestSegment | null> {
    return await this.findOneBy({ name });
  }
}

/**
 * Repository for A/B test analytics and results
 */
export class ABTestAnalyticsRepository {
  constructor(private db: DatabaseConnection) {}

  /**
   * Get comprehensive test results
   */
  async getTestResults(testId: string): Promise<TestResults> {
    return await this.db.kysely.transaction().execute(async (trx) => {
      // Get variant performance data
      const variantStats = await trx
        .selectFrom('user_test_assignments')
        .innerJoin('ab_test_variants', 'user_test_assignments.variant_id', 'ab_test_variants.id')
        .select([
          'user_test_assignments.variant_id as variantId',
          'ab_test_variants.name as variantName',
          trx.fn.count('user_test_assignments.id').as('assignments'),
          trx.fn.sum('user_test_assignments.conversions').as('conversions'),
          trx.fn.sum('user_test_assignments.revenue').as('revenue'),
        ])
        .where('user_test_assignments.test_id', '=', testId)
        .groupBy(['user_test_assignments.variant_id', 'ab_test_variants.name'])
        .execute();

      const variants = variantStats.map(stat => {
        const assignments = Number(stat.assignments);
        const conversions = Number(stat.conversions) || 0;
        const revenue = Number(stat.revenue) || 0;
        
        return {
          variantId: stat.variantId,
          variantName: stat.variantName,
          assignments,
          conversions,
          conversionRate: assignments > 0 ? (conversions / assignments) * 100 : 0,
          revenue,
          averageRevenue: conversions > 0 ? revenue / conversions : 0,
        };
      });

      // Determine winner (simple implementation - highest conversion rate)
      const winner = variants.reduce((best, current) => 
        current.conversionRate > best.conversionRate ? current : best
      );

      return {
        testId,
        variants,
        winner: winner?.variantId,
        statisticalSignificance: this.calculateStatisticalSignificance(variants),
      };
    });
  }

  /**
   * Calculate statistical significance (simplified implementation)
   */
  private calculateStatisticalSignificance(variants: any[]): number {
    if (variants.length < 2) return 0;
    
    // This is a simplified implementation
    // In practice, you'd want to use proper statistical tests like Chi-square or Z-test
    const control = variants.find(v => v.variantName.toLowerCase().includes('control')) || variants[0];
    const treatment = variants.find(v => v !== control);
    
    if (!treatment || control.assignments < 100 || treatment.assignments < 100) {
      return 0; // Not enough data
    }
    
    // Simplified confidence calculation
    const controlRate = control.conversionRate / 100;
    const treatmentRate = treatment.conversionRate / 100;
    
    if (Math.abs(treatmentRate - controlRate) > 0.02) { // 2% difference
      return 95; // Assume 95% confidence for significant differences
    }
    
    return 0;
  }

  /**
   * Get test performance over time
   */
  async getTestPerformanceOverTime(testId: string, days: number = 30): Promise<Array<{
    date: string;
    assignments: number;
    conversions: number;
    conversionRate: number;
  }>> {
    return await this.db.kysely
      .selectFrom('user_test_assignments')
      .select([
        this.db.kysely.fn<string>('DATE', ['assigned_at']).as('date'),
        this.db.kysely.fn.count('id').as('assignments'),
        this.db.kysely.fn.sum('conversions').as('conversions'),
      ])
      .where('test_id', '=', testId)
      .where('assigned_at', '>=', new Date(Date.now() - days * 24 * 60 * 60 * 1000))
      .groupBy('date')
      .orderBy('date', 'asc')
      .execute()
      .then(results => results.map(result => {
        const assignments = Number(result.assignments);
        const conversions = Number(result.conversions) || 0;
        return {
          date: result.date,
          assignments,
          conversions,
          conversionRate: assignments > 0 ? (conversions / assignments) * 100 : 0,
        };
      }));
  }
}