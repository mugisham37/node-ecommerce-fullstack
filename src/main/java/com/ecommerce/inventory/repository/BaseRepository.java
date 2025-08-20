package com.ecommerce.inventory.repository;

import org.jooq.DSLContext;
import org.jooq.Record;
import org.jooq.Table;
import org.jooq.TableField;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

/**
 * Base repository interface defining common CRUD operations
 * All repository interfaces should extend this interface
 * 
 * @param <T> Entity type
 * @param <ID> Primary key type
 */
public interface BaseRepository<T, ID> {
    
    /**
     * Save an entity
     * @param entity Entity to save
     * @return Saved entity
     */
    T save(T entity);
    
    /**
     * Save multiple entities
     * @param entities Entities to save
     * @return List of saved entities
     */
    List<T> saveAll(Iterable<T> entities);
    
    /**
     * Find entity by ID
     * @param id Primary key
     * @return Optional containing entity if found
     */
    Optional<T> findById(ID id);
    
    /**
     * Check if entity exists by ID
     * @param id Primary key
     * @return true if entity exists
     */
    boolean existsById(ID id);
    
    /**
     * Find all entities
     * @return List of all entities
     */
    List<T> findAll();
    
    /**
     * Find all entities with pagination
     * @param pageable Pagination parameters
     * @return Page of entities
     */
    Page<T> findAll(Pageable pageable);
    
    /**
     * Count all entities
     * @return Total count
     */
    long count();
    
    /**
     * Delete entity by ID
     * @param id Primary key
     */
    void deleteById(ID id);
    
    /**
     * Delete entity
     * @param entity Entity to delete
     */
    void delete(T entity);
    
    /**
     * Delete multiple entities
     * @param entities Entities to delete
     */
    void deleteAll(Iterable<T> entities);
    
    /**
     * Delete all entities
     */
    void deleteAll();
    
    /**
     * Get DSL context for custom queries
     * @return JOOQ DSL context
     */
    DSLContext getDslContext();
    
    /**
     * Get table reference
     * @return JOOQ table reference
     */
    Table<Record> getTable();
    
    /**
     * Get primary key field
     * @return Primary key table field
     */
    TableField<Record, ID> getIdField();
}