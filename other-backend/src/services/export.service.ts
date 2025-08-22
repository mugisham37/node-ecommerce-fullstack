import { Parser } from 'json2csv';
import * as ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { Prisma } from '@prisma/client';
import prisma from '../database/client';
import { createRequestLogger } from '../utils/logger';
import { ApiError } from '../utils/api-error';
import * as fs from 'fs';
import * as path from 'path';
import {
  ExportFormat,
  ExportFilters,
  OrderWithRelations,
  ProductWithRelations,
  UserWithRelations,
  VendorWithRelations,
  ShippingAddress,
  BillingAddress,
  FormattedOrder,
  FormattedProduct,
  FormattedCustomer,
  FormattedSales,
  FormattedInventory,
  FormattedVendor,
  ExportColumn
} from '../types/export.types';

// Export data type enum for loyalty reports
export enum ExportDataType {
  LOYALTY_POINTS = 'loyalty_points',
  LOYALTY_REDEMPTIONS = 'loyalty_redemptions',
  LOYALTY_TIERS = 'loyalty_tiers',
  LOYALTY_REFERRALS = 'loyalty_referrals',
  LOYALTY_ANALYTICS = 'loyalty_analytics'
}

// Export configuration interface
export interface ExportConfig {
  includeHeaders?: boolean;
  dateFormat?: string;
  numberFormat?: string;
  sheetName?: string;
  title?: string;
}

/**
 * Helper function to get data type title
 */
const getDataTypeTitle = (dataType: ExportDataType): string => {
  const titles = {
    [ExportDataType.LOYALTY_POINTS]: 'Loyalty Points Report',
    [ExportDataType.LOYALTY_REDEMPTIONS]: 'Loyalty Redemptions Report',
    [ExportDataType.LOYALTY_TIERS]: 'Loyalty Tiers Report',
    [ExportDataType.LOYALTY_REFERRALS]: 'Loyalty Referrals Report',
    [ExportDataType.LOYALTY_ANALYTICS]: 'Loyalty Analytics Report'
  };
  return titles[dataType] || 'Export Report';
};

/**
 * Helper function to format field names for display
 */
const formatFieldName = (field: string): string => {
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
};

/**
 * Generic export to CSV format
 * @param data Array of data objects to export
 * @param fields Array of field names to include in export
 * @param dataType Type of data being exported
 * @param requestId Request ID for logging
 * @returns File path of the exported CSV
 */
export const exportToCsv = async (
  data: any[],
  fields: string[],
  dataType: ExportDataType,
  requestId?: string
): Promise<string> => {
  const logger = createRequestLogger(requestId);
  logger.info(`Exporting ${data.length} records to CSV for ${dataType}`);

  try {
    if (!data || data.length === 0) {
      throw new ApiError('No data provided for CSV export', 400);
    }

    // Filter data to only include specified fields
    const filteredData = data.map(item => {
      const filtered: any = {};
      fields.forEach(field => {
        filtered[field] = item[field] !== undefined ? item[field] : '';
      });
      return filtered;
    });

    const parser = new Parser({ fields });
    const csv = parser.parse(filteredData);

    // Generate filename and save to temp directory
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${dataType}_${timestamp}.csv`;
    const filepath = path.join(process.cwd(), 'temp', filename);

    // Ensure temp directory exists
    const tempDir = path.dirname(filepath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    fs.writeFileSync(filepath, csv);
    logger.info(`CSV export completed: ${filepath}`);
    
    return filepath;
  } catch (error: any) {
    logger.error(`Error exporting to CSV: ${error.message}`);
    throw new ApiError(`Failed to export to CSV: ${error.message}`, 500);
  }
};

/**
 * Generic export to Excel format
 * @param data Array of data objects to export
 * @param fields Array of field names to include in export
 * @param dataType Type of data being exported
 * @param requestId Request ID for logging
 * @returns File path of the exported Excel file
 */
export const exportToExcel = async (
  data: any[],
  fields: string[],
  dataType: ExportDataType,
  requestId?: string
): Promise<string> => {
  const logger = createRequestLogger(requestId);
  logger.info(`Exporting ${data.length} records to Excel for ${dataType}`);

  try {
    if (!data || data.length === 0) {
      throw new ApiError('No data provided for Excel export', 400);
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(getDataTypeTitle(dataType));

    // Set up columns
    const columns = fields.map(field => ({
      header: formatFieldName(field),
      key: field,
      width: 15
    }));

    worksheet.columns = columns;

    // Style the header row
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };
    });

    // Add data rows
    data.forEach(item => {
      const row: any = {};
      fields.forEach(field => {
        row[field] = item[field] !== undefined ? item[field] : '';
      });
      worksheet.addRow(row);
    });

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      if (column.eachCell) {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, (cell) => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = Math.min(maxLength + 2, 50);
      }
    });

    // Generate filename and save
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${dataType}_${timestamp}.xlsx`;
    const filepath = path.join(process.cwd(), 'temp', filename);

    // Ensure temp directory exists
    const tempDir = path.dirname(filepath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    await workbook.xlsx.writeFile(filepath);
    logger.info(`Excel export completed: ${filepath}`);
    
    return filepath;
  } catch (error: any) {
    logger.error(`Error exporting to Excel: ${error.message}`);
    throw new ApiError(`Failed to export to Excel: ${error.message}`, 500);
  }
};

/**
 * Generic export to PDF format
 * @param data Array of data objects to export
 * @param fields Array of field names to include in export
 * @param dataType Type of data being exported
 * @param title Title for the PDF report
 * @param requestId Request ID for logging
 * @returns File path of the exported PDF
 */
export const exportToPdf = async (
  data: any[],
  fields: string[],
  dataType: ExportDataType,
  title: string,
  requestId?: string
): Promise<string> => {
  const logger = createRequestLogger(requestId);
  logger.info(`Exporting ${data.length} records to PDF for ${dataType}`);

  return new Promise((resolve, reject) => {
    try {
      if (!data || data.length === 0) {
        throw new ApiError('No data provided for PDF export', 400);
      }

      const doc = new PDFDocument({ margin: 50 });
      
      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${dataType}_${timestamp}.pdf`;
      const filepath = path.join(process.cwd(), 'temp', filename);

      // Ensure temp directory exists
      const tempDir = path.dirname(filepath);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);

      // Add title
      doc.fontSize(16).font('Helvetica-Bold').text(title, { align: 'center' });
      doc.moveDown(2);

      // Calculate column widths
      const pageWidth = doc.page.width - 100; // Account for margins
      const colWidth = pageWidth / fields.length;

      // Add headers
      doc.fontSize(10).font('Helvetica-Bold');
      let yPosition = doc.y;
      fields.forEach((field, index) => {
        doc.text(formatFieldName(field), 50 + (index * colWidth), yPosition, {
          width: colWidth,
          align: 'left'
        });
      });

      doc.moveDown(1);

      // Add data rows
      doc.font('Helvetica').fontSize(9);
      data.forEach((item, rowIndex) => {
        if (doc.y > doc.page.height - 100) {
          doc.addPage();
          // Repeat headers on new page
          doc.fontSize(10).font('Helvetica-Bold');
          yPosition = doc.y;
          fields.forEach((field, index) => {
            doc.text(formatFieldName(field), 50 + (index * colWidth), yPosition, {
              width: colWidth,
              align: 'left'
            });
          });
          doc.moveDown(1);
          doc.font('Helvetica').fontSize(9);
        }

        yPosition = doc.y;
        fields.forEach((field, index) => {
          const value = item[field] !== undefined ? item[field].toString() : '';
          doc.text(value, 50 + (index * colWidth), yPosition, {
            width: colWidth,
            align: 'left'
          });
        });
        doc.moveDown(0.5);
      });

      doc.end();

      stream.on('finish', () => {
        logger.info(`PDF export completed: ${filepath}`);
        resolve(filepath);
      });

      stream.on('error', (error) => {
        logger.error(`Error writing PDF: ${error.message}`);
        reject(new ApiError(`Failed to write PDF: ${error.message}`, 500));
      });

    } catch (error: any) {
      logger.error(`Error exporting to PDF: ${error.message}`);
      reject(new ApiError(`Failed to export to PDF: ${error.message}`, 500));
    }
  });
};

/**
 * Generic export to JSON format
 * @param data Array of data objects to export
 * @param dataType Type of data being exported
 * @param requestId Request ID for logging
 * @returns File path of the exported JSON file
 */
export const exportToJson = async (
  data: any[],
  dataType: ExportDataType,
  requestId?: string
): Promise<string> => {
  const logger = createRequestLogger(requestId);
  logger.info(`Exporting ${data.length} records to JSON for ${dataType}`);

  try {
    if (!data || data.length === 0) {
      throw new ApiError('No data provided for JSON export', 400);
    }

    const exportObject = {
      dataType,
      exportDate: new Date().toISOString(),
      totalRecords: data.length,
      data: data
    };

    const jsonString = JSON.stringify(exportObject, null, 2);

    // Generate filename and save
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${dataType}_${timestamp}.json`;
    const filepath = path.join(process.cwd(), 'temp', filename);

    // Ensure temp directory exists
    const tempDir = path.dirname(filepath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    fs.writeFileSync(filepath, jsonString);
    logger.info(`JSON export completed: ${filepath}`);
    
    return filepath;
  } catch (error: any) {
    logger.error(`Error exporting to JSON: ${error.message}`);
    throw new ApiError(`Failed to export to JSON: ${error.message}`, 500);
  }
};

export class ExportService {
  private logger = createRequestLogger();

  /**
   * Export orders to CSV format
   */
  async exportOrdersToCSV(vendorId?: string): Promise<Buffer> {
    try {
      const whereClause: Prisma.OrderWhereInput = vendorId ? { vendorId } : {};
      
      const orders = await prisma.order.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          vendor: {
            select: {
              id: true,
              businessName: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const csvData = orders.map((order: OrderWithRelations) => {
        const shippingAddr = order.shippingAddress as unknown as ShippingAddress;
        return {
          'Order Number': order.orderNumber,
          'Customer Name': `${order.user.firstName} ${order.user.lastName}`,
          'Customer Email': order.user.email,
          'Customer Phone': order.user.phone || 'N/A',
          'Order Date': order.createdAt.toISOString().split('T')[0],
          'Status': order.status,
          'Payment Status': order.paymentStatus,
          'Items Count': order.items?.length || 0,
          'Items': order.items?.map((item) => `${item.product.name} (${item.quantity})`).join(', ') || 'N/A',
          'Subtotal': Number(order.subtotal),
          'Tax': Number(order.taxAmount),
          'Shipping': Number(order.shippingAmount),
          'Discount': Number(order.discountAmount),
          'Total': Number(order.total),
          'Shipping Address': shippingAddr ? `${shippingAddr.street}, ${shippingAddr.city}, ${shippingAddr.state} ${shippingAddr.postalCode}, ${shippingAddr.country}` : 'N/A',
        };
      });

      const parser = new Parser();
      const csv = parser.parse(csvData);
      return Buffer.from(csv, 'utf8');
    } catch (error: any) {
      this.logger.error(`Error exporting orders to CSV: ${error.message}`);
      throw new ApiError(`Failed to export orders to CSV: ${error.message}`, 500);
    }
  }

  /**
   * Export products to CSV format
   */
  async exportProductsToCSV(vendorId?: string): Promise<Buffer> {
    try {
      const whereClause: Prisma.ProductWhereInput = {
        ...(vendorId && { vendorId }),
      };

      const products = await prisma.product.findMany({
        where: whereClause,
        include: {
          vendor: {
            select: {
              businessName: true,
            },
          },
          category: {
            select: {
              name: true,
            },
          },
          reviews: {
            select: {
              rating: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const csvData = products.map((product: ProductWithRelations) => {
        const avgRating = product.reviews.length > 0 
          ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length 
          : 0;

        return {
          'Product Name': product.name,
          'SKU': product.sku || 'N/A',
          'Description': product.description,
          'Price': Number(product.price),
          'Compare At Price': Number(product.compareAtPrice || 0),
          'Quantity': product.quantity,
          'Category': product.category.name,
          'Vendor': product.vendor.businessName,
          'Featured': product.featured ? 'Yes' : 'No',
          'Active': product.active ? 'Yes' : 'No',
          'Average Rating': avgRating.toFixed(2),
          'Reviews Count': product.reviews.length,
          'Created Date': product.createdAt.toISOString().split('T')[0],
          'Tags': product.tags.join(', '),
        };
      });

      const parser = new Parser();
      const csv = parser.parse(csvData);
      return Buffer.from(csv, 'utf8');
    } catch (error: any) {
      this.logger.error(`Error exporting products to CSV: ${error.message}`);
      throw new ApiError(`Failed to export products to CSV: ${error.message}`, 500);
    }
  }

  /**
   * Export users to CSV format
   */
  async exportUsersToCSV(): Promise<Buffer> {
    try {
      const users = await prisma.user.findMany({
        include: {
          orders: {
            select: {
              id: true,
              total: true,
              status: true,
            },
          },
          addresses: true,
          country: {
            select: {
              name: true,
              code: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const csvData = users.map((user: UserWithRelations) => {
        const completedOrders = user.orders.filter(order => 
          order.status === 'DELIVERED' || order.status === 'SHIPPED'
        );
        const totalSpent = completedOrders.reduce((sum, order) => sum + Number(order.total), 0);

        return {
          'Name': `${user.firstName} ${user.lastName}`,
          'Email': user.email,
          'Phone': user.phone || 'N/A',
          'Country': user.country?.name || 'N/A',
          'Registration Date': user.createdAt.toISOString().split('T')[0],
          'Total Orders': completedOrders.length,
          'Total Spent': totalSpent.toFixed(2),
          'Loyalty Points': user.loyaltyPoints,
          'Status': user.isActive ? 'Active' : 'Inactive',
          'Addresses Count': user.addresses?.length || 0,
        };
      });

      const parser = new Parser();
      const csv = parser.parse(csvData);
      return Buffer.from(csv, 'utf8');
    } catch (error: any) {
      this.logger.error(`Error exporting users to CSV: ${error.message}`);
      throw new ApiError(`Failed to export users to CSV: ${error.message}`, 500);
    }
  }

  /**
   * Export orders to Excel format
   */
  async exportOrdersToExcel(vendorId?: string): Promise<Buffer> {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Orders');

      // Define columns
      const columns: ExportColumn[] = [
        { key: 'orderNumber', header: 'Order Number', width: 15 },
        { key: 'customerName', header: 'Customer Name', width: 20 },
        { key: 'customerEmail', header: 'Customer Email', width: 25 },
        { key: 'orderDate', header: 'Order Date', width: 12 },
        { key: 'status', header: 'Status', width: 12 },
        { key: 'total', header: 'Total', width: 12 },
      ];

      worksheet.columns = columns.map((column: ExportColumn) => ({
        header: column.header,
        key: column.key,
        width: column.width,
      }));

      // Style the header row
      worksheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' },
        };
      });

      const whereClause: Prisma.OrderWhereInput = vendorId ? { vendorId } : {};
      
      const orders = await prisma.order.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      orders.forEach((order) => {
        worksheet.addRow({
          orderNumber: order.orderNumber,
          customerName: `${order.user.firstName} ${order.user.lastName}`,
          customerEmail: order.user.email,
          orderDate: order.createdAt.toISOString().split('T')[0],
          status: order.status,
          total: Number(order.total),
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      return Buffer.from(buffer);
    } catch (error: any) {
      this.logger.error(`Error exporting orders to Excel: ${error.message}`);
      throw new ApiError(`Failed to export orders to Excel: ${error.message}`, 500);
    }
  }

  /**
   * Export orders to PDF format
   */
  async exportOrdersToPDF(vendorId?: string): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument();
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        // PDF content
        doc.fontSize(20).text('Orders Report', 100, 100);
        doc.moveDown();

        const whereClause: Prisma.OrderWhereInput = vendorId ? { vendorId } : {};
        
        const orders = await prisma.order.findMany({
          where: whereClause,
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 50, // Limit for PDF
        });

        let y = 150;
        orders.forEach((order, index: number) => {
          if (y > 700) {
            doc.addPage();
            y = 50;
          }

          doc.fontSize(12)
             .text(`${index + 1}. Order #${order.orderNumber}`, 100, y)
             .text(`Customer: ${order.user.firstName} ${order.user.lastName}`, 100, y + 15)
             .text(`Date: ${order.createdAt.toISOString().split('T')[0]}`, 100, y + 30)
             .text(`Status: ${order.status}`, 100, y + 45)
             .text(`Total: $${Number(order.total).toFixed(2)}`, 100, y + 60);

          y += 90;
        });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Export orders with filters
   */
  async exportOrders(
    format: ExportFormat,
    filters: ExportFilters = {},
    requestId?: string,
  ): Promise<Buffer> {
    this.logger.info(`Exporting orders with format: ${format}`);

    try {
      // Build query from filters
      const where: Prisma.OrderWhereInput = {};

      if (filters.startDate && filters.endDate) {
        where.createdAt = {
          gte: new Date(filters.startDate),
          lte: new Date(filters.endDate),
        };
      }

      if (filters.status) {
        where.status = filters.status as any;
      }

      if (filters.paymentStatus) {
        where.paymentStatus = filters.paymentStatus as any;
      }

      if (filters.vendorId) {
        where.vendorId = filters.vendorId;
      }

      // Get orders
      const orders = await prisma.order.findMany({
        where,
        include: {
          user: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  name: true,
                  sku: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Format data for export
      const formattedOrders: FormattedOrder[] = orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: `${order.user.firstName} ${order.user.lastName}`,
        customerEmail: order.user.email,
        status: order.status,
        paymentStatus: order.paymentStatus,
        totalAmount: Number(order.total).toFixed(2),
        subtotalAmount: Number(order.subtotal).toFixed(2),
        taxAmount: Number(order.taxAmount).toFixed(2),
        shippingAmount: Number(order.shippingAmount).toFixed(2),
        discountAmount: Number(order.discountAmount || 0).toFixed(2),
        shippingAddress: order.shippingAddress ? 
          (() => {
            const addr = order.shippingAddress as unknown as ShippingAddress;
            return `${addr.street}, ${addr.city}, ${addr.state} ${addr.postalCode}, ${addr.country}`;
          })() : 'N/A',
        paymentMethod: order.paymentMethod || 'N/A',
        createdAt: new Date(order.createdAt).toLocaleString(),
        itemCount: order.items.length,
        items: order.items.map(item => `${item.product?.name || 'Unknown'} (${item.quantity})`).join('; '),
      }));

      // Export based on format
      switch (format) {
        case 'csv':
          const parser = new Parser();
          const csv = parser.parse(formattedOrders);
          return Buffer.from(csv, 'utf8');
        case 'excel':
          return this.exportOrdersToExcel(filters.vendorId);
        case 'pdf':
          return this.exportOrdersToPDF(filters.vendorId);
        default:
          throw new ApiError(`Unsupported export format: ${format}`, 400);
      }
    } catch (error: any) {
      this.logger.error(`Error exporting orders: ${error.message}`);
      throw error;
    }
  }

  /**
   * Export products with filters
   */
  async exportProducts(
    format: ExportFormat,
    filters: ExportFilters = {},
    requestId?: string,
  ): Promise<Buffer> {
    this.logger.info(`Exporting products with format: ${format}`);

    try {
      // Build query from filters
      const where: Prisma.ProductWhereInput = {};

      if (filters.categoryId) {
        where.categoryId = filters.categoryId;
      }

      if (filters.vendorId) {
        where.vendorId = filters.vendorId;
      }

      if (filters.minPrice && filters.maxPrice) {
        where.price = {
          gte: Number(filters.minPrice),
          lte: Number(filters.maxPrice),
        };
      } else if (filters.minPrice) {
        where.price = { gte: Number(filters.minPrice) };
      } else if (filters.maxPrice) {
        where.price = { lte: Number(filters.maxPrice) };
      }

      if (filters.inStock !== undefined) {
        where.quantity = filters.inStock ? { gt: 0 } : { lte: 0 };
      }

      if (filters.featured !== undefined) {
        where.featured = filters.featured;
      }

      if (filters.active !== undefined) {
        where.active = filters.active;
      }

      // Get products
      const products = await prisma.product.findMany({
        where,
        include: {
          category: {
            select: {
              name: true,
            },
          },
          vendor: {
            select: {
              businessName: true,
            },
          },
          reviews: {
            select: {
              rating: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      });

      // Format data for export
      const formattedProducts: FormattedProduct[] = products.map((product) => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        category: product.category.name,
        vendor: product.vendor.businessName,
        price: Number(product.price).toFixed(2),
        compareAtPrice: Number(product.compareAtPrice || 0).toFixed(2),
        quantity: product.quantity,
        inStock: product.quantity > 0 ? "Yes" : "No",
        featured: product.featured ? "Yes" : "No",
        active: product.active ? "Yes" : "No",
        averageRating: product.reviews.length > 0 
          ? (product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length).toFixed(2)
          : "0.00",
        reviewCount: product.reviews.length,
        createdAt: new Date(product.createdAt).toLocaleString(),
        updatedAt: new Date(product.updatedAt).toLocaleString(),
      }));

      // Export based on format
      switch (format) {
        case 'csv':
          const parser = new Parser();
          const csv = parser.parse(formattedProducts);
          return Buffer.from(csv, 'utf8');
        default:
          throw new ApiError(`Unsupported export format: ${format}`, 400);
      }
    } catch (error: any) {
      this.logger.error(`Error exporting products: ${error.message}`);
      throw error;
    }
  }

  /**
   * Export customers with filters
   */
  async exportCustomers(
    format: ExportFormat,
    filters: ExportFilters = {},
    requestId?: string,
  ): Promise<Buffer> {
    this.logger.info(`Exporting customers with format: ${format}`);

    try {
      // Build query from filters
      const where: Prisma.UserWhereInput = { role: "CUSTOMER" };

      if (filters.startDate && filters.endDate) {
        where.createdAt = {
          gte: new Date(filters.startDate),
          lte: new Date(filters.endDate),
        };
      }

      if (filters.isActive !== undefined) {
        where.isActive = filters.isActive;
      }

      // Get customers
      const customers = await prisma.user.findMany({
        where,
        include: {
          orders: {
            select: {
              total: true,
              status: true,
            },
          },
          addresses: true,
          country: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { lastName: 'asc' },
      });

      // Format data for export
      const formattedCustomers: FormattedCustomer[] = customers.map((customer) => {
        const completedOrders = customer.orders.filter(order => 
          order.status === 'DELIVERED' || order.status === 'SHIPPED'
        );
        const totalSpent = completedOrders.reduce((sum, order) => sum + Number(order.total), 0);
        const orderCount = completedOrders.length;
        const averageOrderValue = orderCount > 0 ? totalSpent / orderCount : 0;

        return {
          id: customer.id,
          email: customer.email,
          firstName: customer.firstName,
          lastName: customer.lastName,
          fullName: `${customer.firstName} ${customer.lastName}`,
          phone: customer.phone || "N/A",
          country: customer.country?.name || "N/A",
          isActive: customer.isActive ? "Yes" : "No",
          orderCount,
          totalSpent: totalSpent.toFixed(2),
          averageOrderValue: averageOrderValue.toFixed(2),
          loyaltyPoints: customer.loyaltyPoints || 0,
          createdAt: new Date(customer.createdAt).toLocaleString(),
          lastLoginAt: customer.lastLoginAt ? new Date(customer.lastLoginAt).toLocaleString() : "Never",
          addressCount: customer.addresses.length,
        };
      });

      // Export based on format
      switch (format) {
        case 'csv':
          const parser = new Parser();
          const csv = parser.parse(formattedCustomers);
          return Buffer.from(csv, 'utf8');
        default:
          throw new ApiError(`Unsupported export format: ${format}`, 400);
      }
    } catch (error: any) {
      this.logger.error(`Error exporting customers: ${error.message}`);
      throw error;
    }
  }
}

export default new ExportService();
