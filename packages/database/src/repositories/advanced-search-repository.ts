import { eq, and, or, desc, asc, sql, gte, lte, inArray, ilike } from 'drizzle-orm';
import { 
  searchIndexes, 
  searchQueries, 
  searchSuggestions, 
  searchFilters, 
  searchAnalytics,
  searchResultClicks,
  savedSearches,
  SearchIndex,
  NewSearchIndex,
  SearchQuery,
  NewSearchQuery,
  SearchSuggestion,
  NewSearchSuggestion,
  SearchFilter,
  NewSearchFilter,
  SearchAnalytics,
  NewSearchAnalytics,
  SearchResultClick,
  NewSearchResultClick,
  SavedSearch,
  NewSavedSearch,
  EntityType,
  SuggestionType,
  FilterType
} from '../schema/advanced-search';
import { BaseRepository, FilterOptions, PaginationOptions, PagedResult } from './base/base-repository';
import { DatabaseConnection } from '../connection';

export interface SearchIndexFilters extends FilterOptions {
  entityType?: string;
  entityId?: string;
  language?: string;
  isActive?: boolean;
}

export interface SearchQueryFilters extends FilterOptions {
  userId?: string;
  sessionId?: string;
  hasResults?: boolean;
  hasClicks?: boolean;
  hasConversion?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface SuggestionFilters extends FilterOptions {
  type?: string;
  language?: string;
  isActive?: boolean;
  minPopularity?: number;
}

export interface SearchResult {
  entityType: string;
  entityId: string;
  title: string;
  content: string;
  score: number;
  metadata?: any;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  suggestions: string[];
  filters: SearchFilter[];
  facets: Record<string, Array<{ value: string; count: number }>>;
}

/**
 * Repository for search indexes
 */
export class SearchIndexRepository extends BaseRepository<
  typeof searchIndexes,
  SearchIndex,
  NewSearchIndex
> {
  protected table = searchIndexes;
  protected tableName = 'search_indexes';

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
   * Find index by entity
   */
  async findByEntity(entityType: string, entityId: string): Promise<SearchIndex | null> {
    return await this.findOneBy({ entityType, entityId });
  }

  /**
   * Upsert search index
   */
  async upsertIndex(data: {
    entityType: string;
    entityId: string;
    title: string;
    content: string;
    keywords?: string;
    tags?: any;
    metadata?: any;
    language?: string;
  }): Promise<SearchIndex> {
    return await this.executeKyselyQuery(async (db) => {
      const existing = await db
        .selectFrom('search_indexes')
        .selectAll()
        .where('entity_type', '=', data.entityType)
        .where('entity_id', '=', data.entityId)
        .executeTakeFirst();

      // Generate search vector (simplified - in production you'd use PostgreSQL's to_tsvector)
      const searchVector = `${data.title} ${data.content} ${data.keywords || ''}`.toLowerCase();

      if (existing) {
        const updated = await db
          .updateTable('search_indexes')
          .set({
            title: data.title,
            content: data.content,
            keywords: data.keywords,
            tags: JSON.stringify(data.tags),
            metadata: JSON.stringify(data.metadata),
            search_vector: searchVector,
            language: data.language || 'english',
            last_indexed: new Date(),
            updated_at: new Date(),
          })
          .where('id', '=', existing.id)
          .returningAll()
          .executeTakeFirst();

        return {
          id: updated!.id,
          entityType: updated!.entity_type,
          entityId: updated!.entity_id,
          title: updated!.title,
          content: updated!.content,
          keywords: updated!.keywords,
          tags: updated!.tags,
          metadata: updated!.metadata,
          searchVector: updated!.search_vector,
          language: updated!.language,
          isActive: updated!.is_active,
          lastIndexed: updated!.last_indexed,
          createdAt: updated!.created_at,
          updatedAt: updated!.updated_at,
        } as SearchIndex;
      } else {
        const created = await db
          .insertInto('search_indexes')
          .values({
            entity_type: data.entityType,
            entity_id: data.entityId,
            title: data.title,
            content: data.content,
            keywords: data.keywords,
            tags: JSON.stringify(data.tags),
            metadata: JSON.stringify(data.metadata),
            search_vector: searchVector,
            language: data.language || 'english',
            is_active: true,
            last_indexed: new Date(),
            created_at: new Date(),
            updated_at: new Date(),
          })
          .returningAll()
          .executeTakeFirst();

        return {
          id: created!.id,
          entityType: created!.entity_type,
          entityId: created!.entity_id,
          title: created!.title,
          content: created!.content,
          keywords: created!.keywords,
          tags: created!.tags,
          metadata: created!.metadata,
          searchVector: created!.search_vector,
          language: created!.language,
          isActive: created!.is_active,
          lastIndexed: created!.last_indexed,
          createdAt: created!.created_at,
          updatedAt: created!.updated_at,
        } as SearchIndex;
      }
    });
  }

  /**
   * Perform full-text search
   */
  async search(
    query: string,
    entityTypes?: string[],
    language: string = 'english',
    limit: number = 20,
    offset: number = 0
  ): Promise<SearchResult[]> {
    return await this.executeKyselyQuery(async (db) => {
      let searchQuery = db
        .selectFrom('search_indexes')
        .select([
          'entity_type as entityType',
          'entity_id as entityId',
          'title',
          'content',
          'metadata',
          // Simple scoring based on title and content matches
          sql<number>`
            CASE 
              WHEN LOWER(title) LIKE LOWER(${`%${query}%`}) THEN 10
              ELSE 0
            END +
            CASE 
              WHEN LOWER(content) LIKE LOWER(${`%${query}%`}) THEN 5
              ELSE 0
            END +
            CASE 
              WHEN LOWER(keywords) LIKE LOWER(${`%${query}%`}) THEN 3
              ELSE 0
            END
          `.as('score')
        ])
        .where('is_active', '=', true)
        .where('language', '=', language)
        .where((eb) => eb.or([
          eb('title', 'ilike', `%${query}%`),
          eb('content', 'ilike', `%${query}%`),
          eb('keywords', 'ilike', `%${query}%`),
        ]));

      if (entityTypes && entityTypes.length > 0) {
        searchQuery = searchQuery.where('entity_type', 'in', entityTypes);
      }

      const results = await searchQuery
        .orderBy('score', 'desc')
        .orderBy('last_indexed', 'desc')
        .limit(limit)
        .offset(offset)
        .execute();

      return results.map(result => ({
        entityType: result.entityType,
        entityId: result.entityId,
        title: result.title,
        content: result.content,
        score: Number(result.score),
        metadata: result.metadata ? JSON.parse(result.metadata as string) : undefined,
      }));
    });
  }

  /**
   * Reindex entity
   */
  async reindexEntity(entityType: string, entityId: string): Promise<void> {
    await this.executeKyselyQuery(async (db) => {
      await db
        .updateTable('search_indexes')
        .set({
          last_indexed: new Date(),
          updated_at: new Date(),
        })
        .where('entity_type', '=', entityType)
        .where('entity_id', '=', entityId)
        .execute();
    });
  }

  /**
   * Get entities needing reindexing
   */
  async getEntitiesNeedingReindex(hours: number = 24): Promise<SearchIndex[]> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    return await this.executeKyselyQuery(async (db) => {
      const indexes = await db
        .selectFrom('search_indexes')
        .selectAll()
        .where('is_active', '=', true)
        .where((eb) => eb.or([
          eb('last_indexed', 'is', null),
          eb('last_indexed', '<', cutoff)
        ]))
        .orderBy('last_indexed', 'asc')
        .execute();

      return indexes.map(index => ({
        id: index.id,
        entityType: index.entity_type,
        entityId: index.entity_id,
        title: index.title,
        content: index.content,
        keywords: index.keywords,
        tags: index.tags,
        metadata: index.metadata,
        searchVector: index.search_vector,
        language: index.language,
        isActive: index.is_active,
        lastIndexed: index.last_indexed,
        createdAt: index.created_at,
        updatedAt: index.updated_at,
      }));
    });
  }
}/**
 * 
Repository for search queries
 */
export class SearchQueryRepository extends BaseRepository<
  typeof searchQueries,
  SearchQuery,
  NewSearchQuery
> {
  protected table = searchQueries;
  protected tableName = 'search_queries';

  constructor(db: DatabaseConnection) {
    super(db, {
      enableSoftDelete: false,
      timestampFields: {
        createdAt: 'createdAt',
      },
    });
  }

  /**
   * Record search query
   */
  async recordQuery(data: {
    userId?: string;
    sessionId?: string;
    query: string;
    filters?: any;
    sortBy?: string;
    sortOrder?: string;
    resultCount: number;
    searchTime?: number;
    source?: string;
    userAgent?: string;
    ipAddress?: string;
    referrer?: string;
  }): Promise<SearchQuery> {
    const normalizedQuery = data.query.toLowerCase().trim();
    
    return await this.create({
      ...data,
      normalizedQuery,
      hasResults: data.resultCount > 0,
      hasClicks: false,
      hasConversion: false,
    } as NewSearchQuery);
  }

  /**
   * Update query with click data
   */
  async updateQueryWithClick(queryId: string, clickedResults: string[]): Promise<void> {
    await this.executeKyselyQuery(async (db) => {
      await db
        .updateTable('search_queries')
        .set({
          clicked_results: JSON.stringify(clickedResults),
          first_result_clicked: clickedResults.length > 0,
          has_clicks: true,
        })
        .where('id', '=', queryId)
        .execute();
    });
  }

  /**
   * Update query with conversion data
   */
  async updateQueryWithConversion(queryId: string, conversionValue: number): Promise<void> {
    await this.executeKyselyQuery(async (db) => {
      await db
        .updateTable('search_queries')
        .set({
          has_conversion: true,
          conversion_value: conversionValue.toString(),
        })
        .where('id', '=', queryId)
        .execute();
    });
  }

  /**
   * Get popular search queries
   */
  async getPopularQueries(days: number = 30, limit: number = 20): Promise<Array<{
    query: string;
    count: number;
    averageResults: number;
    clickThroughRate: number;
  }>> {
    return await this.executeKyselyQuery(async (db) => {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const queries = await db
        .selectFrom('search_queries')
        .select([
          'normalized_query as query',
          db.fn.count('id').as('count'),
          db.fn.avg('result_count').as('averageResults'),
          sql<number>`
            CASE 
              WHEN COUNT(id) > 0 THEN 
                (COUNT(CASE WHEN has_clicks = true THEN 1 END)::float / COUNT(id)::float) * 100
              ELSE 0 
            END
          `.as('clickThroughRate'),
        ])
        .where('created_at', '>=', startDate)
        .groupBy('normalized_query')
        .orderBy('count', 'desc')
        .limit(limit)
        .execute();

      return queries.map(query => ({
        query: query.query,
        count: Number(query.count),
        averageResults: Number(query.averageResults) || 0,
        clickThroughRate: Number(query.clickThroughRate) || 0,
      }));
    });
  }

  /**
   * Get zero result queries
   */
  async getZeroResultQueries(days: number = 7, limit: number = 50): Promise<Array<{
    query: string;
    count: number;
    lastSearched: Date;
  }>> {
    return await this.executeKyselyQuery(async (db) => {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const queries = await db
        .selectFrom('search_queries')
        .select([
          'normalized_query as query',
          db.fn.count('id').as('count'),
          db.fn.max('created_at').as('lastSearched'),
        ])
        .where('created_at', '>=', startDate)
        .where('result_count', '=', 0)
        .groupBy('normalized_query')
        .orderBy('count', 'desc')
        .limit(limit)
        .execute();

      return queries.map(query => ({
        query: query.query,
        count: Number(query.count),
        lastSearched: query.lastSearched,
      }));
    });
  }
}

/**
 * Repository for search suggestions
 */
export class SearchSuggestionRepository extends BaseRepository<
  typeof searchSuggestions,
  SearchSuggestion,
  NewSearchSuggestion
> {
  protected table = searchSuggestions;
  protected tableName = 'search_suggestions';

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
   * Get suggestions for query
   */
  async getSuggestions(
    query: string,
    type?: string,
    language: string = 'english',
    limit: number = 10
  ): Promise<SearchSuggestion[]> {
    return await this.executeKyselyQuery(async (db) => {
      let suggestionQuery = db
        .selectFrom('search_suggestions')
        .selectAll()
        .where('is_active', '=', true)
        .where('language', '=', language)
        .where('suggestion', 'ilike', `${query}%`);

      if (type) {
        suggestionQuery = suggestionQuery.where('type', '=', type);
      }

      const suggestions = await suggestionQuery
        .orderBy('popularity', 'desc')
        .orderBy('search_count', 'desc')
        .limit(limit)
        .execute();

      return suggestions.map(suggestion => ({
        id: suggestion.id,
        suggestion: suggestion.suggestion,
        type: suggestion.type,
        entityId: suggestion.entity_id,
        popularity: suggestion.popularity,
        searchCount: suggestion.search_count,
        clickCount: suggestion.click_count,
        conversionCount: suggestion.conversion_count,
        language: suggestion.language,
        isActive: suggestion.is_active,
        createdAt: suggestion.created_at,
        updatedAt: suggestion.updated_at,
      }));
    });
  }

  /**
   * Upsert suggestion
   */
  async upsertSuggestion(data: {
    suggestion: string;
    type: string;
    entityId?: string;
    language?: string;
  }): Promise<SearchSuggestion> {
    return await this.executeKyselyQuery(async (db) => {
      const existing = await db
        .selectFrom('search_suggestions')
        .selectAll()
        .where('suggestion', '=', data.suggestion)
        .where('type', '=', data.type)
        .executeTakeFirst();

      if (existing) {
        const updated = await db
          .updateTable('search_suggestions')
          .set({
            popularity: existing.popularity + 1,
            updated_at: new Date(),
          })
          .where('id', '=', existing.id)
          .returningAll()
          .executeTakeFirst();

        return {
          id: updated!.id,
          suggestion: updated!.suggestion,
          type: updated!.type,
          entityId: updated!.entity_id,
          popularity: updated!.popularity,
          searchCount: updated!.search_count,
          clickCount: updated!.click_count,
          conversionCount: updated!.conversion_count,
          language: updated!.language,
          isActive: updated!.is_active,
          createdAt: updated!.created_at,
          updatedAt: updated!.updated_at,
        } as SearchSuggestion;
      } else {
        const created = await db
          .insertInto('search_suggestions')
          .values({
            suggestion: data.suggestion,
            type: data.type,
            entity_id: data.entityId,
            language: data.language || 'english',
            popularity: 1,
            search_count: 0,
            click_count: 0,
            conversion_count: 0,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
          })
          .returningAll()
          .executeTakeFirst();

        return {
          id: created!.id,
          suggestion: created!.suggestion,
          type: created!.type,
          entityId: created!.entity_id,
          popularity: created!.popularity,
          searchCount: created!.search_count,
          clickCount: created!.click_count,
          conversionCount: created!.conversion_count,
          language: created!.language,
          isActive: created!.is_active,
          createdAt: created!.created_at,
          updatedAt: created!.updated_at,
        } as SearchSuggestion;
      }
    });
  }

  /**
   * Update suggestion metrics
   */
  async updateSuggestionMetrics(
    suggestionId: string,
    metrics: {
      searchCount?: number;
      clickCount?: number;
      conversionCount?: number;
    }
  ): Promise<void> {
    await this.executeKyselyQuery(async (db) => {
      const updates: any = { updated_at: new Date() };
      
      if (metrics.searchCount) {
        updates.search_count = sql`search_count + ${metrics.searchCount}`;
      }
      if (metrics.clickCount) {
        updates.click_count = sql`click_count + ${metrics.clickCount}`;
      }
      if (metrics.conversionCount) {
        updates.conversion_count = sql`conversion_count + ${metrics.conversionCount}`;
      }

      await db
        .updateTable('search_suggestions')
        .set(updates)
        .where('id', '=', suggestionId)
        .execute();
    });
  }
}

/**
 * Repository for search filters
 */
export class SearchFilterRepository extends BaseRepository<
  typeof searchFilters,
  SearchFilter,
  NewSearchFilter
> {
  protected table = searchFilters;
  protected tableName = 'search_filters';

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
   * Get filters by entity type
   */
  async getFiltersByEntityType(entityType: string): Promise<SearchFilter[]> {
    return await this.executeKyselyQuery(async (db) => {
      const filters = await db
        .selectFrom('search_filters')
        .selectAll()
        .where('entity_type', '=', entityType)
        .where('is_active', '=', true)
        .orderBy('sort_order', 'asc')
        .orderBy('display_name', 'asc')
        .execute();

      return filters.map(filter => ({
        id: filter.id,
        name: filter.name,
        displayName: filter.display_name,
        type: filter.type,
        entityType: filter.entity_type,
        fieldPath: filter.field_path,
        options: filter.options,
        minValue: filter.min_value,
        maxValue: filter.max_value,
        defaultValue: filter.default_value,
        isRequired: filter.is_required,
        isActive: filter.is_active,
        sortOrder: filter.sort_order,
        description: filter.description,
        createdAt: filter.created_at,
        updatedAt: filter.updated_at,
      }));
    });
  }

  /**
   * Get filter by name and entity type
   */
  async getFilterByName(name: string, entityType: string): Promise<SearchFilter | null> {
    return await this.findOneBy({ name, entityType });
  }
}

/**
 * Repository for search analytics
 */
export class SearchAnalyticsRepository extends BaseRepository<
  typeof searchAnalytics,
  SearchAnalytics,
  NewSearchAnalytics
> {
  protected table = searchAnalytics;
  protected tableName = 'search_analytics';

  constructor(db: DatabaseConnection) {
    super(db, {
      enableSoftDelete: false,
      timestampFields: {
        createdAt: 'createdAt',
      },
    });
  }

  /**
   * Aggregate daily search analytics
   */
  async aggregateDailyAnalytics(date: Date): Promise<void> {
    await this.executeKyselyQuery(async (db) => {
      // Get aggregated data for the date
      const analytics = await db
        .selectFrom('search_queries')
        .select([
          'normalized_query as query',
          db.fn.count('id').as('searchCount'),
          db.fn.countDistinct('user_id').as('uniqueUsers'),
          db.fn.countDistinct('session_id').as('uniqueSessions'),
          db.fn.sum('result_count').as('totalResults'),
          db.fn.avg('result_count').as('averageResults'),
          db.fn.avg('search_time').as('averageSearchTime'),
          db.fn.count('id').filterWhere('result_count', '=', 0).as('zeroResultsCount'),
          db.fn.count('id').filterWhere('has_clicks', '=', true).as('totalClicks'),
          db.fn.count('id').filterWhere('has_conversion', '=', true).as('totalConversions'),
          db.fn.sum('conversion_value').as('totalConversionValue'),
        ])
        .where(sql`DATE(created_at)`, '=', date)
        .groupBy('normalized_query')
        .execute();

      // Upsert analytics data
      for (const analytic of analytics) {
        const searchCount = Number(analytic.searchCount);
        const totalClicks = Number(analytic.totalClicks);
        const clickThroughRate = searchCount > 0 ? (totalClicks / searchCount) : 0;
        const conversionRate = searchCount > 0 ? (Number(analytic.totalConversions) / searchCount) : 0;

        await db
          .insertInto('search_analytics')
          .values({
            date,
            query: analytic.query,
            normalized_query: analytic.query,
            search_count: searchCount,
            unique_users: Number(analytic.uniqueUsers),
            unique_sessions: Number(analytic.uniqueSessions),
            total_results: Number(analytic.totalResults) || 0,
            average_results: Number(analytic.averageResults) || 0,
            average_search_time: Number(analytic.averageSearchTime) || 0,
            zero_results_count: Number(analytic.zeroResultsCount),
            click_through_rate: clickThroughRate.toString(),
            total_clicks: totalClicks,
            conversion_rate: conversionRate.toString(),
            total_conversions: Number(analytic.totalConversions),
            total_conversion_value: Number(analytic.totalConversionValue) || 0,
            created_at: new Date(),
          })
          .onConflict((oc) => oc
            .columns(['date', 'normalized_query'])
            .doUpdateSet({
              search_count: sql`excluded.search_count`,
              unique_users: sql`excluded.unique_users`,
              unique_sessions: sql`excluded.unique_sessions`,
              total_results: sql`excluded.total_results`,
              average_results: sql`excluded.average_results`,
              average_search_time: sql`excluded.average_search_time`,
              zero_results_count: sql`excluded.zero_results_count`,
              click_through_rate: sql`excluded.click_through_rate`,
              total_clicks: sql`excluded.total_clicks`,
              conversion_rate: sql`excluded.conversion_rate`,
              total_conversions: sql`excluded.total_conversions`,
              total_conversion_value: sql`excluded.total_conversion_value`,
            })
          )
          .execute();
      }
    });
  }

  /**
   * Get search performance metrics
   */
  async getSearchMetrics(days: number = 30): Promise<{
    totalSearches: number;
    uniqueUsers: number;
    averageResultsPerSearch: number;
    clickThroughRate: number;
    conversionRate: number;
    zeroResultRate: number;
    topQueries: Array<{ query: string; count: number }>;
  }> {
    return await this.executeKyselyQuery(async (db) => {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const metrics = await db
        .selectFrom('search_analytics')
        .select([
          db.fn.sum('search_count').as('totalSearches'),
          db.fn.sum('unique_users').as('uniqueUsers'),
          db.fn.avg('average_results').as('averageResultsPerSearch'),
          db.fn.avg('click_through_rate').as('clickThroughRate'),
          db.fn.avg('conversion_rate').as('conversionRate'),
          sql<number>`
            CASE 
              WHEN SUM(search_count) > 0 THEN 
                (SUM(zero_results_count)::float / SUM(search_count)::float) * 100
              ELSE 0 
            END
          `.as('zeroResultRate'),
        ])
        .where('date', '>=', startDate)
        .executeTakeFirst();

      const topQueries = await db
        .selectFrom('search_analytics')
        .select([
          'query',
          db.fn.sum('search_count').as('count'),
        ])
        .where('date', '>=', startDate)
        .groupBy('query')
        .orderBy('count', 'desc')
        .limit(10)
        .execute();

      return {
        totalSearches: Number(metrics?.totalSearches) || 0,
        uniqueUsers: Number(metrics?.uniqueUsers) || 0,
        averageResultsPerSearch: Number(metrics?.averageResultsPerSearch) || 0,
        clickThroughRate: Number(metrics?.clickThroughRate) || 0,
        conversionRate: Number(metrics?.conversionRate) || 0,
        zeroResultRate: Number(metrics?.zeroResultRate) || 0,
        topQueries: topQueries.map(q => ({
          query: q.query,
          count: Number(q.count),
        })),
      };
    });
  }
}

/**
 * Repository for search result clicks
 */
export class SearchResultClickRepository extends BaseRepository<
  typeof searchResultClicks,
  SearchResultClick,
  NewSearchResultClick
> {
  protected table = searchResultClicks;
  protected tableName = 'search_result_clicks';

  constructor(db: DatabaseConnection) {
    super(db, {
      enableSoftDelete: false,
      timestampFields: {
        createdAt: 'clickedAt',
      },
    });
  }

  /**
   * Record result click
   */
  async recordClick(data: {
    searchQueryId: string;
    userId?: string;
    sessionId?: string;
    resultType: string;
    resultId: string;
    resultPosition: number;
    resultScore?: number;
  }): Promise<SearchResultClick> {
    return await this.create(data as NewSearchResultClick);
  }

  /**
   * Update click with engagement data
   */
  async updateClickEngagement(
    clickId: string,
    timeOnPage: number,
    bounced: boolean,
    converted: boolean,
    conversionValue?: number
  ): Promise<void> {
    await this.executeKyselyQuery(async (db) => {
      await db
        .updateTable('search_result_clicks')
        .set({
          time_on_page: timeOnPage,
          bounced,
          converted,
          conversion_value: conversionValue?.toString(),
        })
        .where('id', '=', clickId)
        .execute();
    });
  }

  /**
   * Get click analytics
   */
  async getClickAnalytics(days: number = 30): Promise<{
    totalClicks: number;
    averagePosition: number;
    bounceRate: number;
    conversionRate: number;
    topClickedResults: Array<{
      resultType: string;
      resultId: string;
      clicks: number;
      averagePosition: number;
    }>;
  }> {
    return await this.executeKyselyQuery(async (db) => {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const metrics = await db
        .selectFrom('search_result_clicks')
        .select([
          db.fn.count('id').as('totalClicks'),
          db.fn.avg('result_position').as('averagePosition'),
          sql<number>`
            CASE 
              WHEN COUNT(id) > 0 THEN 
                (COUNT(CASE WHEN bounced = true THEN 1 END)::float / COUNT(id)::float) * 100
              ELSE 0 
            END
          `.as('bounceRate'),
          sql<number>`
            CASE 
              WHEN COUNT(id) > 0 THEN 
                (COUNT(CASE WHEN converted = true THEN 1 END)::float / COUNT(id)::float) * 100
              ELSE 0 
            END
          `.as('conversionRate'),
        ])
        .where('clicked_at', '>=', startDate)
        .executeTakeFirst();

      const topResults = await db
        .selectFrom('search_result_clicks')
        .select([
          'result_type as resultType',
          'result_id as resultId',
          db.fn.count('id').as('clicks'),
          db.fn.avg('result_position').as('averagePosition'),
        ])
        .where('clicked_at', '>=', startDate)
        .groupBy(['result_type', 'result_id'])
        .orderBy('clicks', 'desc')
        .limit(10)
        .execute();

      return {
        totalClicks: Number(metrics?.totalClicks) || 0,
        averagePosition: Number(metrics?.averagePosition) || 0,
        bounceRate: Number(metrics?.bounceRate) || 0,
        conversionRate: Number(metrics?.conversionRate) || 0,
        topClickedResults: topResults.map(result => ({
          resultType: result.resultType,
          resultId: result.resultId,
          clicks: Number(result.clicks),
          averagePosition: Number(result.averagePosition) || 0,
        })),
      };
    });
  }
}

/**
 * Repository for saved searches
 */
export class SavedSearchRepository extends BaseRepository<
  typeof savedSearches,
  SavedSearch,
  NewSavedSearch
> {
  protected table = savedSearches;
  protected tableName = 'saved_searches';

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
   * Find user's saved searches
   */
  async findByUser(userId: string): Promise<SavedSearch[]> {
    return await this.findBy({ userId, isActive: true });
  }

  /**
   * Update search usage
   */
  async updateUsage(searchId: string): Promise<void> {
    await this.executeKyselyQuery(async (db) => {
      await db
        .updateTable('saved_searches')
        .set({
          last_used: new Date(),
          use_count: sql`use_count + 1`,
          updated_at: new Date(),
        })
        .where('id', '=', searchId)
        .execute();
    });
  }

  /**
   * Check if search name exists for user
   */
  async nameExistsForUser(userId: string, name: string, excludeId?: string): Promise<boolean> {
    const filters: FilterOptions = { userId, name };
    if (excludeId) {
      filters.id = { operator: 'not', value: excludeId };
    }
    
    return await this.exists(filters);
  }
}