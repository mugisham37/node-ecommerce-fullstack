import { Prisma } from '@prisma/client'
import prisma from '../database/client'
import { createRequestLogger } from '../utils/logger'
import { PaginatedResponse, PaginationParams } from '../../../shared/src/types/common.types'

const logger = createRequestLogger('repository')

export interface BaseRepositoryInterface<T, CreateInput, UpdateInput> {
  findById(id: string): Promise<T | null>
  findMany(params?: FindManyParams): Promise<PaginatedResponse<T>>
  findFirst(where: any): Promise<T | null>
  create(data: CreateInput): Promise<T>
  update(id: string, data: UpdateInput): Promise<T>
  delete(id: string): Promise<void>
  softDelete(id: string): Promise<T>
  count(where?: any): Promise<number>
  exists(where: any): Promise<boolean>
}

export interface FindManyParams extends PaginationParams {
  where?: any
  include?: any
  select?: any
  orderBy?: any
}

export abstract class BaseRepository<T, CreateInput, UpdateInput> 
  implements BaseRepositoryInterface<T, CreateInput, UpdateInput> {
  
  protected abstract modelName: string
  protected abstract model: any

  constructor() {}

  async findById(id: string): Promise<T | null> {
    try {
      logger.debug(`Finding ${this.modelName} by ID: ${id}`)
      
      const result = await this.model.findUnique({
        where: { id },
      })

      return result
    } catch (error: any) {
      logger.error(`Error finding ${this.modelName} by ID:`, error)
      throw error
    }
  }

  async findMany(params: FindManyParams = {}): Promise<PaginatedResponse<T>> {
    try {
      const {
        page = 1,
        limit = 10,
        where = {},
        include,
        select,
        orderBy = { createdAt: 'desc' },
        sortBy,
        sortOrder = 'desc'
      } = params

      logger.debug(`Finding many ${this.modelName} with params:`, params)

      // Handle sorting
      let finalOrderBy = orderBy
      if (sortBy) {
        finalOrderBy = { [sortBy]: sortOrder }
      }

      // Calculate pagination
      const skip = (page - 1) * limit
      const take = limit

      // Execute queries in parallel
      const [data, total] = await Promise.all([
        this.model.findMany({
          where: this.buildWhereClause(where),
          include,
          select,
          orderBy: finalOrderBy,
          skip,
          take,
        }),
        this.model.count({
          where: this.buildWhereClause(where),
        }),
      ])

      const totalPages = Math.ceil(total / limit)

      return {
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      }
    } catch (error: any) {
      logger.error(`Error finding many ${this.modelName}:`, error)
      throw error
    }
  }

  async findFirst(where: any): Promise<T | null> {
    try {
      logger.debug(`Finding first ${this.modelName} with where:`, where)
      
      const result = await this.model.findFirst({
        where: this.buildWhereClause(where),
      })

      return result
    } catch (error: any) {
      logger.error(`Error finding first ${this.modelName}:`, error)
      throw error
    }
  }

  async create(data: CreateInput): Promise<T> {
    try {
      logger.debug(`Creating ${this.modelName} with data:`, data)
      
      const result = await this.model.create({
        data,
      })

      logger.info(`Created ${this.modelName} with ID: ${result.id}`)
      return result
    } catch (error: any) {
      logger.error(`Error creating ${this.modelName}:`, error)
      throw error
    }
  }

  async update(id: string, data: UpdateInput): Promise<T> {
    try {
      logger.debug(`Updating ${this.modelName} ${id} with data:`, data)
      
      const result = await this.model.update({
        where: { id },
        data,
      })

      logger.info(`Updated ${this.modelName} with ID: ${id}`)
      return result
    } catch (error: any) {
      logger.error(`Error updating ${this.modelName}:`, error)
      throw error
    }
  }

  async delete(id: string): Promise<void> {
    try {
      logger.debug(`Deleting ${this.modelName} with ID: ${id}`)
      
      await this.model.delete({
        where: { id },
      })

      logger.info(`Deleted ${this.modelName} with ID: ${id}`)
    } catch (error: any) {
      logger.error(`Error deleting ${this.modelName}:`, error)
      throw error
    }
  }

  async softDelete(id: string): Promise<T> {
    try {
      logger.debug(`Soft deleting ${this.modelName} with ID: ${id}`)
      
      const result = await this.model.update({
        where: { id },
        data: {
          deletedAt: new Date(),
        },
      })

      logger.info(`Soft deleted ${this.modelName} with ID: ${id}`)
      return result
    } catch (error: any) {
      logger.error(`Error soft deleting ${this.modelName}:`, error)
      throw error
    }
  }

  async count(where: any = {}): Promise<number> {
    try {
      logger.debug(`Counting ${this.modelName} with where:`, where)
      
      const count = await this.model.count({
        where: this.buildWhereClause(where),
      })

      return count
    } catch (error: any) {
      logger.error(`Error counting ${this.modelName}:`, error)
      throw error
    }
  }

  async exists(where: any): Promise<boolean> {
    try {
      logger.debug(`Checking if ${this.modelName} exists with where:`, where)
      
      const count = await this.model.count({
        where: this.buildWhereClause(where),
        take: 1,
      })

      return count > 0
    } catch (error: any) {
      logger.error(`Error checking if ${this.modelName} exists:`, error)
      throw error
    }
  }

  // Transaction support
  async transaction<R>(fn: (tx: any) => Promise<R>): Promise<R> {
    try {
      return await prisma.$transaction(fn)
    } catch (error: any) {
      logger.error(`Transaction failed for ${this.modelName}:`, error)
      throw error
    }
  }

  // Batch operations
  async createMany(data: CreateInput[]): Promise<{ count: number }> {
    try {
      logger.debug(`Creating many ${this.modelName} with ${data.length} items`)
      
      const result = await this.model.createMany({
        data,
        skipDuplicates: true,
      })

      logger.info(`Created ${result.count} ${this.modelName} records`)
      return result
    } catch (error: any) {
      logger.error(`Error creating many ${this.modelName}:`, error)
      throw error
    }
  }

  async updateMany(where: any, data: Partial<UpdateInput>): Promise<{ count: number }> {
    try {
      logger.debug(`Updating many ${this.modelName} with where:`, where)
      
      const result = await this.model.updateMany({
        where: this.buildWhereClause(where),
        data,
      })

      logger.info(`Updated ${result.count} ${this.modelName} records`)
      return result
    } catch (error: any) {
      logger.error(`Error updating many ${this.modelName}:`, error)
      throw error
    }
  }

  async deleteMany(where: any): Promise<{ count: number }> {
    try {
      logger.debug(`Deleting many ${this.modelName} with where:`, where)
      
      const result = await this.model.deleteMany({
        where: this.buildWhereClause(where),
      })

      logger.info(`Deleted ${result.count} ${this.modelName} records`)
      return result
    } catch (error: any) {
      logger.error(`Error deleting many ${this.modelName}:`, error)
      throw error
    }
  }

  // Helper methods
  protected buildWhereClause(where: any): any {
    // Add soft delete filter by default
    const baseWhere = {
      ...where,
    }

    // Only add deletedAt filter if the model supports soft deletes
    if (this.supportsSoftDelete()) {
      baseWhere.deletedAt = null
    }

    return baseWhere
  }

  protected supportsSoftDelete(): boolean {
    // Override in child classes if model supports soft delete
    return false
  }

  // Search functionality
  async search(query: string, searchFields: string[], params: FindManyParams = {}): Promise<PaginatedResponse<T>> {
    try {
      const searchWhere = {
        OR: searchFields.map(field => ({
          [field]: {
            contains: query,
            mode: 'insensitive' as const,
          },
        })),
      }

      const combinedWhere = {
        ...params.where,
        ...searchWhere,
      }

      return this.findMany({
        ...params,
        where: combinedWhere,
      })
    } catch (error: any) {
      logger.error(`Error searching ${this.modelName}:`, error)
      throw error
    }
  }

  // Aggregation helpers
  async aggregate(aggregation: any): Promise<any> {
    try {
      logger.debug(`Aggregating ${this.modelName} with:`, aggregation)
      
      const result = await this.model.aggregate(aggregation)
      return result
    } catch (error: any) {
      logger.error(`Error aggregating ${this.modelName}:`, error)
      throw error
    }
  }

  async groupBy(groupBy: any): Promise<any> {
    try {
      logger.debug(`Grouping ${this.modelName} by:`, groupBy)
      
      const result = await this.model.groupBy(groupBy)
      return result
    } catch (error: any) {
      logger.error(`Error grouping ${this.modelName}:`, error)
      throw error
    }
  }
}
