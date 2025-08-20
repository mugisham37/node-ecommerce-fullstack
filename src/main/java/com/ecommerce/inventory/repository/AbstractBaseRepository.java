package com.ecommerce.inventory.repository;

import org.jooq.*;
import org.jooq.impl.DSL;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Abstract base repository implementation with JOOQ DSL context
 * Provides common CRUD operations and transaction management
 * 
 * @param <T> Entity type
 * @param <ID> Primary key type
 */
public abstract class AbstractBaseRepository<T, ID> implements BaseRepository<T, ID> {
    
    private static final Logger logger = LoggerFactory.getLogger(AbstractBaseRepository.class);
    
    @Autowired
    protected DSLContext dsl;
    
    @Autowired
    protected ConnectionManager connectionManager;
    
    /**
     * Convert JOOQ record to entity
     * @param record JOOQ record
     * @return Entity instance
     */
    protected abstract T recordToEntity(Record record);
    
    /**
     * Convert entity to JOOQ record for insert/update
     * @param entity Entity instance
     * @return JOOQ record
     */
    protected abstract Record entityToRecord(T entity);
    
    /**
     * Get entity class
     * @return Entity class
     */
    protected abstract Class<T> getEntityClass();
    
    @Override
    @Transactional
    public T save(T entity) {
        logger.debug("Saving entity of type: {}", getEntityClass().getSimpleName());
        
        try {
            Record record = entityToRecord(entity);
            
            // Check if this is an insert or update based on ID
            ID id = getEntityId(entity);
            if (id == null) {
                // Insert new record
                Record insertedRecord = dsl.insertInto(getTable())
                    .set(record)
                    .returning()
                    .fetchOne();
                
                if (insertedRecord == null) {
                    throw new RuntimeException("Failed to insert entity");
                }
                
                T savedEntity = recordToEntity(insertedRecord);
                logger.debug("Successfully inserted entity with ID: {}", getEntityId(savedEntity));
                return savedEntity;
            } else {
                // Update existing record
                int updatedRows = dsl.update(getTable())
                    .set(record)
                    .where(getIdField().eq(id))
                    .execute();
                
                if (updatedRows == 0) {
                    throw new RuntimeException("Entity not found for update: " + id);
                }
                
                logger.debug("Successfully updated entity with ID: {}", id);
                return entity;
            }
        } catch (Exception e) {
            logger.error("Error saving entity of type: {}", getEntityClass().getSimpleName(), e);
            throw new RuntimeException("Failed to save entity", e);
        }
    }
    
    @Override
    @Transactional
    public List<T> saveAll(Iterable<T> entities) {
        logger.debug("Saving multiple entities of type: {}", getEntityClass().getSimpleName());
        
        if (entities == null) {
            return List.of();
        }
        
        return saveSequentially(entities);
    }
    
    private List<T> saveBatch(Iterable<T> entities) {
        try {
            List<T> savedEntities = new java.util.ArrayList<>();
            for (T entity : entities) {
                savedEntities.add(save(entity));
            }
            return savedEntities;
        } catch (Exception e) {
            logger.warn("Batch insert failed, falling back to sequential saves", e);
            return saveSequentially(entities);
        }
    }
    
    private List<T> saveSequentially(Iterable<T> entities) {
        List<T> savedEntities = new java.util.ArrayList<>();
        for (T entity : entities) {
            savedEntities.add(save(entity));
        }
        return savedEntities;
    }
    
    @Override
    @Transactional(readOnly = true)
    public Optional<T> findById(ID id) {
        logger.debug("Finding entity by ID: {} of type: {}", id, getEntityClass().getSimpleName());
        
        try {
            Record record = dsl.selectFrom(getTable())
                .where(getIdField().eq(id))
                .fetchOne();
            
            if (record != null) {
                T entity = recordToEntity(record);
                logger.debug("Found entity with ID: {}", id);
                return Optional.of(entity);
            } else {
                logger.debug("Entity not found with ID: {}", id);
                return Optional.empty();
            }
        } catch (Exception e) {
            logger.error("Error finding entity by ID: {}", id, e);
            throw new RuntimeException("Failed to find entity by ID", e);
        }
    }
    
    @Override
    @Transactional(readOnly = true)
    public boolean existsById(ID id) {
        logger.debug("Checking existence of entity with ID: {}", id);
        
        try {
            Integer count = dsl.selectCount()
                .from(getTable())
                .where(getIdField().eq(id))
                .fetchOne(0, Integer.class);
            
            boolean exists = count != null && count > 0;
            logger.debug("Entity with ID {} exists: {}", id, exists);
            return exists;
        } catch (Exception e) {
            logger.error("Error checking entity existence by ID: {}", id, e);
            throw new RuntimeException("Failed to check entity existence", e);
        }
    }
    
    @Override
    @Transactional(readOnly = true)
    public List<T> findAll() {
        logger.debug("Finding all entities of type: {}", getEntityClass().getSimpleName());
        
        try {
            Result<Record> records = dsl.selectFrom(getTable())
                .orderBy(getIdField().asc())
                .fetch();
            
            List<T> entities = records.stream()
                .map(this::recordToEntity)
                .collect(Collectors.toList());
            
            logger.debug("Found {} entities", entities.size());
            return entities;
        } catch (Exception e) {
            logger.error("Error finding all entities of type: {}", getEntityClass().getSimpleName(), e);
            throw new RuntimeException("Failed to find all entities", e);
        }
    }
    
    @Override
    @Transactional(readOnly = true)
    public Page<T> findAll(Pageable pageable) {
        logger.debug("Finding entities with pagination: page={}, size={}", 
                    pageable.getPageNumber(), pageable.getPageSize());
        
        try {
            // Get total count
            long totalCount = count();
            
            // Get paginated results
            SelectLimitPercentStep<Record> query = dsl.selectFrom(getTable())
                .orderBy(getIdField().asc())
                .limit(pageable.getPageSize())
                .offset((int) pageable.getOffset());
            
            Result<Record> records = query.fetch();
            
            List<T> entities = records.stream()
                .map(this::recordToEntity)
                .collect(Collectors.toList());
            
            logger.debug("Found {} entities for page {} of {}", 
                        entities.size(), pageable.getPageNumber(), totalCount);
            
            return new PageImpl<>(entities, pageable, totalCount);
        } catch (Exception e) {
            logger.error("Error finding entities with pagination", e);
            throw new RuntimeException("Failed to find entities with pagination", e);
        }
    }
    
    @Override
    @Transactional(readOnly = true)
    public long count() {
        logger.debug("Counting entities of type: {}", getEntityClass().getSimpleName());
        
        try {
            Integer count = dsl.selectCount()
                .from(getTable())
                .fetchOne(0, Integer.class);
            
            long totalCount = count != null ? count.longValue() : 0L;
            logger.debug("Total count: {}", totalCount);
            return totalCount;
        } catch (Exception e) {
            logger.error("Error counting entities of type: {}", getEntityClass().getSimpleName(), e);
            throw new RuntimeException("Failed to count entities", e);
        }
    }
    
    @Override
    @Transactional
    public void deleteById(ID id) {
        logger.debug("Deleting entity by ID: {}", id);
        
        try {
            int deletedRows = dsl.deleteFrom(getTable())
                .where(getIdField().eq(id))
                .execute();
            
            if (deletedRows == 0) {
                logger.warn("No entity found to delete with ID: {}", id);
            } else {
                logger.debug("Successfully deleted entity with ID: {}", id);
            }
        } catch (Exception e) {
            logger.error("Error deleting entity by ID: {}", id, e);
            throw new RuntimeException("Failed to delete entity by ID", e);
        }
    }
    
    @Override
    @Transactional
    public void delete(T entity) {
        ID id = getEntityId(entity);
        if (id != null) {
            deleteById(id);
        } else {
            logger.warn("Cannot delete entity without ID");
        }
    }
    
    @Override
    @Transactional
    public void deleteAll(Iterable<T> entities) {
        logger.debug("Deleting multiple entities");
        
        List<ID> ids = new java.util.ArrayList<>();
        for (T entity : entities) {
            ID id = getEntityId(entity);
            if (id != null) {
                ids.add(id);
            }
        }
        
        if (!ids.isEmpty()) {
            try {
                int deletedRows = dsl.deleteFrom(getTable())
                    .where(getIdField().in(ids))
                    .execute();
                
                logger.debug("Deleted {} entities", deletedRows);
            } catch (Exception e) {
                logger.error("Error deleting multiple entities", e);
                throw new RuntimeException("Failed to delete entities", e);
            }
        }
    }
    
    @Override
    @Transactional
    public void deleteAll() {
        logger.debug("Deleting all entities of type: {}", getEntityClass().getSimpleName());
        
        try {
            int deletedRows = dsl.deleteFrom(getTable()).execute();
            logger.debug("Deleted {} entities", deletedRows);
        } catch (Exception e) {
            logger.error("Error deleting all entities", e);
            throw new RuntimeException("Failed to delete all entities", e);
        }
    }
    
    @Override
    public DSLContext getDslContext() {
        return dsl;
    }
    
    /**
     * Extract entity ID for internal operations
     * @param entity Entity instance
     * @return Entity ID
     */
    protected abstract ID getEntityId(T entity);
    
    /**
     * Create condition for soft delete queries (override if entity supports soft delete)
     * @return Condition for active records, or null if no soft delete
     */
    protected Condition getActiveCondition() {
        return null; // Override in subclasses that support soft delete
    }
    
    /**
     * Find all active entities (for soft delete support)
     * @return List of active entities
     */
    @Transactional(readOnly = true)
    public List<T> findAllActive() {
        logger.debug("Finding all active entities of type: {}", getEntityClass().getSimpleName());
        
        try {
            SelectConditionStep<Record> query = dsl.selectFrom(getTable());
            
            Condition activeCondition = getActiveCondition();
            if (activeCondition != null) {
                query = query.where(activeCondition);
            }
            
            Result<Record> records = query.orderBy(getIdField().asc()).fetch();
            
            List<T> entities = records.stream()
                .map(this::recordToEntity)
                .collect(Collectors.toList());
            
            logger.debug("Found {} active entities", entities.size());
            return entities;
        } catch (Exception e) {
            logger.error("Error finding active entities", e);
            throw new RuntimeException("Failed to find active entities", e);
        }
    }
    
    /**
     * Find active entities with pagination
     * @param pageable Pagination parameters
     * @return Page of active entities
     */
    @Transactional(readOnly = true)
    public Page<T> findAllActive(Pageable pageable) {
        logger.debug("Finding active entities with pagination");
        
        try {
            SelectConditionStep<Record> baseQuery = dsl.selectFrom(getTable());
            SelectConditionStep<Record> countQuery = dsl.selectCount().from(getTable());
            
            Condition activeCondition = getActiveCondition();
            if (activeCondition != null) {
                baseQuery = baseQuery.where(activeCondition);
                countQuery = countQuery.where(activeCondition);
            }
            
            // Get total count
            Integer totalCount = countQuery.fetchOne(0, Integer.class);
            long total = totalCount != null ? totalCount.longValue() : 0L;
            
            // Get paginated results
            Result<Record> records = baseQuery
                .orderBy(getIdField().asc())
                .limit(pageable.getPageSize())
                .offset((int) pageable.getOffset())
                .fetch();
            
            List<T> entities = records.stream()
                .map(this::recordToEntity)
                .collect(Collectors.toList());
            
            return new PageImpl<>(entities, pageable, total);
        } catch (Exception e) {
            logger.error("Error finding active entities with pagination", e);
            throw new RuntimeException("Failed to find active entities with pagination", e);
        }
    }
}