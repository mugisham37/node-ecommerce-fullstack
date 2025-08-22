// Advanced search types for tRPC compatibility

export interface SearchQuery {
  query?: string;
  filters?: SearchFilters;
  sort?: SearchSort;
  facets?: string[];
  page?: number;
  limit?: number;
  includeAggregations?: boolean;
}

export interface SearchFilters {
  categoryId?: string[];
  vendorId?: string[];
  priceMin?: number;
  priceMax?: number;
  inStock?: boolean;
  featured?: boolean;
  active?: boolean;
  rating?: number;
  tags?: string[];
  attributes?: Record<string, any>;
  dateFrom?: Date;
  dateTo?: Date;
  location?: {
    latitude: number;
    longitude: number;
    radius: number; // in kilometers
  };
}

export interface SearchSort {
  field: SearchSortField;
  direction: 'asc' | 'desc';
}

export type SearchSortField = 
  | 'relevance'
  | 'price'
  | 'name'
  | 'rating'
  | 'popularity'
  | 'newest'
  | 'sales'
  | 'distance';

export interface SearchResult<T = any> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  facets?: SearchFacet[];
  aggregations?: SearchAggregation[];
  suggestions?: string[];
  correctedQuery?: string;
  searchTime: number; // milliseconds
}

export interface SearchFacet {
  field: string;
  name: string;
  values: SearchFacetValue[];
}

export interface SearchFacetValue {
  value: string;
  label: string;
  count: number;
  selected: boolean;
}

export interface SearchAggregation {
  field: string;
  name: string;
  type: 'terms' | 'range' | 'histogram' | 'stats';
  data: any;
}

// Product search specific types
export interface ProductSearchResult {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  price: number;
  compareAtPrice: number | null;
  images: Array<{
    url: string;
    altText?: string;
  }>;
  category: {
    id: string;
    name: string;
  } | null;
  vendor: {
    id: string;
    businessName: string;
  } | null;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  quantity: number;
  featured: boolean;
  tags: string[];
  attributes: Record<string, any>;
  relevanceScore?: number;
  distance?: number; // if location-based search
}

// Search suggestions and autocomplete
export interface SearchSuggestion {
  query: string;
  type: 'query' | 'product' | 'category' | 'vendor';
  count?: number;
  metadata?: any;
}

export interface AutocompleteRequest {
  query: string;
  limit?: number;
  types?: ('query' | 'product' | 'category' | 'vendor')[];
}

export interface AutocompleteResponse {
  suggestions: SearchSuggestion[];
  searchTime: number;
}

// Search analytics types
export interface SearchAnalytics {
  totalSearches: number;
  uniqueSearches: number;
  averageResultsPerSearch: number;
  zeroResultSearches: number;
  zeroResultRate: number;
  topQueries: Array<{
    query: string;
    count: number;
    resultCount: number;
    clickThroughRate: number;
  }>;
  topZeroResultQueries: Array<{
    query: string;
    count: number;
  }>;
  searchTrend: Array<{
    date: Date;
    searches: number;
    uniqueSearches: number;
    zeroResults: number;
  }>;
  popularFilters: Array<{
    filter: string;
    value: string;
    count: number;
  }>;
}

export interface SearchEvent {
  id: string;
  sessionId: string;
  userId: string | null;
  query: string;
  filters: SearchFilters | null;
  resultCount: number;
  searchTime: number;
  clickedResults: string[]; // Product IDs that were clicked
  position: number | null; // Position of clicked result
  createdAt: Date;
}

// Search index management
export interface SearchIndex {
  id: string;
  name: string;
  type: 'product' | 'category' | 'vendor' | 'content';
  status: 'active' | 'building' | 'error';
  documentCount: number;
  lastUpdated: Date;
  settings: SearchIndexSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface SearchIndexSettings {
  searchableFields: string[];
  filterableFields: string[];
  sortableFields: string[];
  facetFields: string[];
  synonyms: Record<string, string[]>;
  stopWords: string[];
  minWordLength: number;
  typoTolerance: boolean;
  proximityPrecision: number;
}

export interface IndexDocumentInput {
  id: string;
  type: string;
  data: Record<string, any>;
}

export interface BulkIndexInput {
  documents: IndexDocumentInput[];
  deleteIds?: string[];
}

// Saved searches and alerts
export interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  query: SearchQuery;
  alertEnabled: boolean;
  alertFrequency: 'immediate' | 'daily' | 'weekly';
  lastAlertSent: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSavedSearchInput {
  name: string;
  query: SearchQuery;
  alertEnabled?: boolean;
  alertFrequency?: 'immediate' | 'daily' | 'weekly';
}

export interface UpdateSavedSearchInput {
  name?: string;
  query?: SearchQuery;
  alertEnabled?: boolean;
  alertFrequency?: 'immediate' | 'daily' | 'weekly';
}

// Search personalization
export interface SearchPersonalization {
  userId: string;
  preferences: {
    preferredCategories: string[];
    preferredVendors: string[];
    priceRange: {
      min: number;
      max: number;
    };
    sortPreference: SearchSortField;
  };
  searchHistory: Array<{
    query: string;
    timestamp: Date;
    resultCount: number;
  }>;
  clickHistory: Array<{
    productId: string;
    query: string;
    position: number;
    timestamp: Date;
  }>;
  updatedAt: Date;
}

// Search configuration
export interface SearchConfiguration {
  enableTypoTolerance: boolean;
  enableSynonyms: boolean;
  enablePersonalization: boolean;
  maxSuggestions: number;
  defaultPageSize: number;
  maxPageSize: number;
  searchTimeout: number; // milliseconds
  cacheTimeout: number; // seconds
  enableAnalytics: boolean;
  enableAutoComplete: boolean;
}