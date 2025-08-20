package com.ecommerce.inventory.repository;

import org.jooq.Condition;
import org.jooq.Field;
import org.jooq.impl.DSL;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Full-text search service for product catalog
 * Provides advanced search capabilities across multiple fields
 */
@Service
public class FullTextSearchService {
    
    private static final Logger logger = LoggerFactory.getLogger(FullTextSearchService.class);
    
    /**
     * Create full-text search condition for multiple fields
     * @param searchTerm Search term
     * @param fields Fields to search in
     * @return JOOQ condition for search
     */
    public Condition createFullTextSearchCondition(String searchTerm, Field<String>... fields) {
        if (searchTerm == null || searchTerm.trim().isEmpty() || fields.length == 0) {
            return DSL.trueCondition();
        }
        
        String cleanedTerm = cleanSearchTerm(searchTerm);
        List<String> searchTokens = tokenizeSearchTerm(cleanedTerm);
        
        logger.debug("Creating full-text search condition for term: {} with tokens: {}", searchTerm, searchTokens);
        
        Condition condition = DSL.falseCondition();
        
        // Search for each token in each field
        for (String token : searchTokens) {
            String likePattern = "%" + token.toLowerCase() + "%";
            
            Condition tokenCondition = DSL.falseCondition();
            for (Field<String> field : fields) {
                tokenCondition = tokenCondition.or(DSL.lower(field).like(likePattern));
            }
            
            condition = condition.or(tokenCondition);
        }
        
        // Add exact phrase matching with higher priority
        if (searchTokens.size() > 1) {
            String exactPhrase = "%" + cleanedTerm.toLowerCase() + "%";
            Condition exactCondition = DSL.falseCondition();
            
            for (Field<String> field : fields) {
                exactCondition = exactCondition.or(DSL.lower(field).like(exactPhrase));
            }
            
            condition = condition.or(exactCondition);
        }
        
        return condition;
    }
    
    /**
     * Create search ranking condition for ordering results by relevance
     * @param searchTerm Search term
     * @param fields Fields to rank by
     * @return JOOQ field for ranking
     */
    public Field<Integer> createSearchRankingField(String searchTerm, Field<String>... fields) {
        if (searchTerm == null || searchTerm.trim().isEmpty() || fields.length == 0) {
            return DSL.inline(0);
        }
        
        String cleanedTerm = cleanSearchTerm(searchTerm);
        
        // Create ranking based on match quality
        org.jooq.CaseConditionStep<Integer> rankingCase = DSL.case_();
        
        // Highest priority: exact match in any field
        for (Field<String> field : fields) {
            rankingCase = rankingCase.when(DSL.lower(field).eq(cleanedTerm.toLowerCase()), 100);
        }
        
        // High priority: starts with search term
        for (Field<String> field : fields) {
            rankingCase = rankingCase.when(DSL.lower(field).like(cleanedTerm.toLowerCase() + "%"), 80);
        }
        
        // Medium priority: contains search term
        for (Field<String> field : fields) {
            rankingCase = rankingCase.when(DSL.lower(field).like("%" + cleanedTerm.toLowerCase() + "%"), 60);
        }
        
        // Lower priority: contains any token
        List<String> tokens = tokenizeSearchTerm(cleanedTerm);
        for (String token : tokens) {
            for (Field<String> field : fields) {
                rankingCase = rankingCase.when(DSL.lower(field).like("%" + token.toLowerCase() + "%"), 40);
            }
        }
        
        return rankingCase.else_(0);
    }
    
    /**
     * Create weighted search condition with field priorities
     * @param searchTerm Search term
     * @param weightedFields Fields with their weights (higher weight = higher priority)
     * @return JOOQ condition
     */
    public Condition createWeightedSearchCondition(String searchTerm, WeightedField... weightedFields) {
        if (searchTerm == null || searchTerm.trim().isEmpty() || weightedFields.length == 0) {
            return DSL.trueCondition();
        }
        
        String cleanedTerm = cleanSearchTerm(searchTerm);
        List<String> searchTokens = tokenizeSearchTerm(cleanedTerm);
        
        Condition condition = DSL.falseCondition();
        
        for (WeightedField weightedField : weightedFields) {
            Field<String> field = weightedField.getField();
            double weight = weightedField.getWeight();
            
            // Apply weight by adjusting search patterns
            if (weight >= 1.0) {
                // High weight fields: more lenient matching
                for (String token : searchTokens) {
                    String pattern = "%" + token.toLowerCase() + "%";
                    condition = condition.or(DSL.lower(field).like(pattern));
                }
                
                // Exact phrase matching for high weight fields
                String exactPhrase = "%" + cleanedTerm.toLowerCase() + "%";
                condition = condition.or(DSL.lower(field).like(exactPhrase));
            } else {
                // Low weight fields: stricter matching
                String exactPhrase = "%" + cleanedTerm.toLowerCase() + "%";
                condition = condition.or(DSL.lower(field).like(exactPhrase));
            }
        }
        
        return condition;
    }
    
    /**
     * Create fuzzy search condition for typo tolerance
     * @param searchTerm Search term
     * @param fields Fields to search in
     * @param maxDistance Maximum edit distance for fuzzy matching
     * @return JOOQ condition
     */
    public Condition createFuzzySearchCondition(String searchTerm, int maxDistance, Field<String>... fields) {
        if (searchTerm == null || searchTerm.trim().isEmpty() || fields.length == 0) {
            return DSL.trueCondition();
        }
        
        String cleanedTerm = cleanSearchTerm(searchTerm);
        
        // For PostgreSQL, we can use similarity functions
        // For now, implement basic fuzzy logic with LIKE patterns
        Condition condition = DSL.falseCondition();
        
        // Generate fuzzy patterns (simplified approach)
        List<String> fuzzyPatterns = generateFuzzyPatterns(cleanedTerm, maxDistance);
        
        for (String pattern : fuzzyPatterns) {
            for (Field<String> field : fields) {
                condition = condition.or(DSL.lower(field).like("%" + pattern.toLowerCase() + "%"));
            }
        }
        
        return condition;
    }
    
    // ========== HELPER METHODS ==========
    
    private String cleanSearchTerm(String searchTerm) {
        if (searchTerm == null) return "";
        
        return searchTerm.trim()
                        .replaceAll("[^a-zA-Z0-9\\s-]", "") // Remove special characters except hyphens
                        .replaceAll("\\s+", " "); // Normalize whitespace
    }
    
    private List<String> tokenizeSearchTerm(String searchTerm) {
        if (searchTerm == null || searchTerm.trim().isEmpty()) {
            return List.of();
        }
        
        return Arrays.stream(searchTerm.split("\\s+"))
                    .filter(token -> token.length() >= 2) // Filter out single characters
                    .collect(Collectors.toList());
    }
    
    private List<String> generateFuzzyPatterns(String term, int maxDistance) {
        List<String> patterns = List.of(term);
        
        // Simple fuzzy pattern generation
        // In a production system, you might want to use more sophisticated algorithms
        if (term.length() > 3) {
            // Add patterns with character substitutions
            patterns = List.of(
                term,
                term.substring(1), // Remove first character
                term.substring(0, term.length() - 1), // Remove last character
                term.replaceAll("([aeiou])", "_") // Replace vowels with wildcards
            );
        }
        
        return patterns;
    }
    
    // ========== HELPER CLASSES ==========
    
    /**
     * Weighted field for search prioritization
     */
    public static class WeightedField {
        private Field<String> field;
        private double weight;
        
        public WeightedField(Field<String> field, double weight) {
            this.field = field;
            this.weight = weight;
        }
        
        public Field<String> getField() { return field; }
        public double getWeight() { return weight; }
        
        public static WeightedField of(Field<String> field, double weight) {
            return new WeightedField(field, weight);
        }
    }
    
    /**
     * Search result with relevance score
     */
    public static class SearchResult<T> {
        private T entity;
        private int relevanceScore;
        
        public SearchResult(T entity, int relevanceScore) {
            this.entity = entity;
            this.relevanceScore = relevanceScore;
        }
        
        public T getEntity() { return entity; }
        public int getRelevanceScore() { return relevanceScore; }
    }
}