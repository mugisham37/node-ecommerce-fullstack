import { Product, Prisma } from '@prisma/client'
import prisma from '../database/client'
import { BaseRepository } from './base.repository'

export type ProductCreateInput = Prisma.ProductCreateInput
export type ProductUpdateInput = Prisma.ProductUpdateInput
export type ProductWithRelations = Prisma.ProductGetPayload<{
  include: {
    category: true
    vendor: true
    images: true
    variants: true
    reviews: true
    subcategories: {
      include: {
        category: true
      }
    }
  }
}>

export interface ProductSearchParams {
  query?: string
  categoryId?: string
  vendorId?: string
  minPrice?: number
  maxPrice?: number
  featured?: boolean
  active?: boolean
  inStock?: boolean
  tags?: string[]
  attributes?: Record<string, string>
  minRating?: number
}

export class ProductRepository extends BaseRepository<Product, ProductCreateInput, ProductUpdateInput> {
  protected modelName = 'Product'
  protected model = prisma.product

  protected supportsSoftDelete(): boolean {
    return true
  }

  // Find product by slug
  async findBySlug(slug: string): Promise<Product | null> {
    return this.model.findUnique({
      where: { slug },
    })
  }

  // Find product with all relations
  async findByIdWithRelations(id: string): Promise<ProductWithRelations | null> {
    return this.model.findUnique({
      where: { id },
      include: {
        category: true,
        vendor: true,
        images: {
          orderBy: { sortOrder: 'asc' },
        },
        variants: {
          orderBy: { createdAt: 'asc' },
        },
        reviews: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        subcategories: {
          include: {
            category: true,
          },
        },
      },
    })
  }

  // Search products with advanced filters
  async searchProducts(params: ProductSearchParams) {
    const {
      query,
      categoryId,
      vendorId,
      minPrice,
      maxPrice,
      featured,
      active = true,
      inStock,
      tags,
      attributes,
      minRating,
    } = params

    const where: Prisma.ProductWhereInput = {
      active,
    }

    // Text search
    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { shortDescription: { contains: query, mode: 'insensitive' } },
        { tags: { has: query } },
      ]
    }

    // Category filter
    if (categoryId) {
      where.OR = [
        { categoryId },
        {
          subcategories: {
            some: {
              categoryId,
            },
          },
        },
      ]
    }

    // Vendor filter
    if (vendorId) {
      where.vendorId = vendorId
    }

    // Price range filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {}
      if (minPrice !== undefined) {
        where.price.gte = minPrice
      }
      if (maxPrice !== undefined) {
        where.price.lte = maxPrice
      }
    }

    // Featured filter
    if (typeof featured === 'boolean') {
      where.featured = featured
    }

    // Stock filter
    if (inStock) {
      where.quantity = { gt: 0 }
    }

    // Tags filter
    if (tags && tags.length > 0) {
      where.tags = {
        hasEvery: tags,
      }
    }

    // Rating filter
    if (minRating !== undefined) {
      where.ratingAverage = { gte: minRating }
    }

    return this.findMany({
      where,
      include: {
        category: true,
        vendor: {
          select: {
            id: true,
            businessName: true,
            slug: true,
            logo: true,
            ratingAverage: true,
          },
        },
        images: {
          orderBy: { sortOrder: 'asc' },
          take: 1,
        },
      },
    })
  }

  // Get featured products
  async getFeaturedProducts(limit: number = 10) {
    return this.findMany({
      where: {
        featured: true,
        active: true,
        quantity: { gt: 0 },
      },
      include: {
        category: true,
        vendor: {
          select: {
            id: true,
            businessName: true,
            slug: true,
            logo: true,
          },
        },
        images: {
          orderBy: { sortOrder: 'asc' },
          take: 1,
        },
      },
      limit,
      orderBy: { createdAt: 'desc' },
    })
  }

  // Get products by category
  async getProductsByCategory(categoryId: string, limit: number = 20) {
    return this.findMany({
      where: {
        OR: [
          { categoryId },
          {
            subcategories: {
              some: {
                categoryId,
              },
            },
          },
        ],
        active: true,
      },
      include: {
        category: true,
        vendor: {
          select: {
            id: true,
            businessName: true,
            slug: true,
            logo: true,
          },
        },
        images: {
          orderBy: { sortOrder: 'asc' },
          take: 1,
        },
      },
      limit,
      orderBy: { createdAt: 'desc' },
    })
  }

  // Get products by vendor
  async getProductsByVendor(vendorId: string, limit: number = 20) {
    return this.findMany({
      where: {
        vendorId,
        active: true,
      },
      include: {
        category: true,
        images: {
          orderBy: { sortOrder: 'asc' },
          take: 1,
        },
      },
      limit,
      orderBy: { createdAt: 'desc' },
    })
  }

  // Get related products
  async getRelatedProducts(productId: string, limit: number = 8) {
    const product = await this.findById(productId)
    if (!product) {
      return { data: [], pagination: { page: 1, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false } }
    }

    return this.findMany({
      where: {
        id: { not: productId },
        OR: [
          { categoryId: product.categoryId },
          { vendorId: product.vendorId },
          {
            tags: {
              hasSome: product.tags,
            },
          },
        ],
        active: true,
        quantity: { gt: 0 },
      },
      include: {
        category: true,
        vendor: {
          select: {
            id: true,
            businessName: true,
            slug: true,
            logo: true,
          },
        },
        images: {
          orderBy: { sortOrder: 'asc' },
          take: 1,
        },
      },
      limit,
      orderBy: { ratingAverage: 'desc' },
    })
  }

  // Get best selling products
  async getBestSellingProducts(limit: number = 10) {
    const bestSellers = await prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: {
        quantity: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: limit,
    })

    const productIds = bestSellers.map(item => item.productId)

    if (productIds.length === 0) {
      return { data: [], pagination: { page: 1, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false } }
    }

    return this.findMany({
      where: {
        id: { in: productIds },
        active: true,
      },
      include: {
        category: true,
        vendor: {
          select: {
            id: true,
            businessName: true,
            slug: true,
            logo: true,
          },
        },
        images: {
          orderBy: { sortOrder: 'asc' },
          take: 1,
        },
      },
      limit,
    })
  }

  // Update product rating
  async updateProductRating(productId: string): Promise<void> {
    const ratingStats = await prisma.review.aggregate({
      where: {
        productId,
      },
      _avg: {
        rating: true,
      },
      _count: true,
    })

    await this.model.update({
      where: { id: productId },
      data: {
        ratingAverage: ratingStats._avg.rating || 0,
        ratingCount: ratingStats._count,
      },
    })
  }

  // Update product stock
  async updateStock(productId: string, quantity: number): Promise<Product> {
    return this.model.update({
      where: { id: productId },
      data: { quantity },
    })
  }

  // Decrease stock (for orders)
  async decreaseStock(productId: string, quantity: number): Promise<Product> {
    return this.model.update({
      where: { id: productId },
      data: {
        quantity: {
          decrement: quantity,
        },
      },
    })
  }

  // Increase stock (for returns/restocks)
  async increaseStock(productId: string, quantity: number): Promise<Product> {
    return this.model.update({
      where: { id: productId },
      data: {
        quantity: {
          increment: quantity,
        },
      },
    })
  }

  // Get low stock products
  async getLowStockProducts(threshold: number = 10) {
    return this.findMany({
      where: {
        quantity: { lte: threshold },
        active: true,
      },
      include: {
        vendor: {
          select: {
            id: true,
            businessName: true,
            email: true,
          },
        },
      },
      orderBy: { quantity: 'asc' },
    })
  }

  // Get product analytics
  async getProductAnalytics(productId: string, startDate: Date, endDate: Date) {
    const [orderStats, viewStats, cartStats] = await Promise.all([
      // Order statistics
      prisma.orderItem.aggregate({
        where: {
          productId,
          order: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
            status: { not: 'CANCELLED' },
          },
        },
        _sum: {
          quantity: true,
          total: true,
        },
        _count: true,
      }),

      // Cart additions (approximate views)
      prisma.cartItem.count({
        where: {
          productId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),

      // Current cart items
      prisma.cartItem.aggregate({
        where: {
          productId,
        },
        _sum: {
          quantity: true,
        },
      }),
    ])

    return {
      totalSold: orderStats._sum.quantity || 0,
      totalRevenue: orderStats._sum.total || 0,
      totalOrders: orderStats._count,
      cartAdditions: viewStats,
      currentCartQuantity: cartStats._sum.quantity || 0,
      conversionRate: viewStats > 0 ? (orderStats._count / viewStats) * 100 : 0,
    }
  }

  // Bulk update products
  async bulkUpdatePrices(vendorId: string, priceMultiplier: number): Promise<{ count: number }> {
    return this.model.updateMany({
      where: { vendorId },
      data: {
        price: {
          multiply: priceMultiplier,
        },
      },
    })
  }

  // Get products needing attention (low stock, no images, etc.)
  async getProductsNeedingAttention(vendorId?: string) {
    const where: Prisma.ProductWhereInput = {
      active: true,
    }

    if (vendorId) {
      where.vendorId = vendorId
    }

    const [lowStock, noImages, noDescription] = await Promise.all([
      this.findMany({
        where: {
          ...where,
          quantity: { lte: 5 },
        },
        select: {
          id: true,
          name: true,
          quantity: true,
          vendor: {
            select: {
              businessName: true,
            },
          },
        },
      }),

      this.findMany({
        where: {
          ...where,
          images: {
            none: {},
          },
        },
        select: {
          id: true,
          name: true,
          vendor: {
            select: {
              businessName: true,
            },
          },
        },
      }),

      this.findMany({
        where: {
          ...where,
          OR: [
            { description: null },
            { description: '' },
            { shortDescription: null },
            { shortDescription: '' },
          ],
        },
        select: {
          id: true,
          name: true,
          vendor: {
            select: {
              businessName: true,
            },
          },
        },
      }),
    ])

    return {
      lowStock: lowStock.data,
      noImages: noImages.data,
      noDescription: noDescription.data,
    }
  }
}

export const productRepository = new ProductRepository()
