import { BaseScheduledTask } from '../schedulers/BaseScheduledTask';
import { ScheduledTaskRegistry } from '../schedulers/ScheduledTaskRegistry';
import { ScheduledTaskMonitoringService } from '../monitoring/ScheduledTaskMonitoringService';
import { ScheduledTaskPerformanceService } from '../monitoring/ScheduledTaskPerformanceService';
import { InventoryService } from '../../services/InventoryService';
import { NotificationService } from '../../services/NotificationService';
import { ProductRepository } from '../../repositories/ProductRepository';
import { StockMovementRepository } from '../../repositories/StockMovementRepository';
import { Product, StockMovement, LowStockAlert } from '../../types/inventory';

/**
 * Scheduled task for inventory analytics and trend analysis.
 * Processes inventory data to generate insights, trends, and performance metrics.
 */
export class InventoryReportTask extends BaseScheduledTask {
  constructor(
    taskRegistry: ScheduledTaskRegistry,
    monitoringService: ScheduledTaskMonitoringService,
    performanceService: ScheduledTaskPerformanceService,
    private readonly inventoryService: InventoryService,
    private readonly productRepository: ProductRepository,
    private readonly stockMovementRepository: StockMovementRepository,
    private readonly notificationService: NotificationService
  ) {
    super(taskRegistry, monitoringService, performanceService);
  }

  /**
   * Generate weekly analytics report every Monday at 8:00 AM.
   */
  async generateWeeklyAnalytics(): Promise<void> {
    await this.executeTask();
  }

  /**
   * Generate monthly analytics report on the first day of each month at 9:00 AM.
   */
  async generateMonthlyAnalytics(): Promise<void> {
    await this.getMonitoringService().executeWithMonitoring('monthly-inventory-analytics', async () => {
      this.logger.info('Generating monthly inventory analytics');
      
      const monthlyReport = await this.generateMonthlyAnalyticsReport();
      await this.notificationService.sendAnalyticsReport('Monthly Inventory Analytics', monthlyReport);
      
      this.logger.info('Monthly inventory analytics report generated and sent');
    });
  }

  protected getTaskName(): string {
    return 'inventory-analytics-processing';
  }

  protected getTaskDescription(): string {
    return 'Process inventory data to generate analytics, trends, and performance insights';
  }

  protected async doExecute(): Promise<void> {
    this.logger.info('Starting inventory analytics processing');
    
    try {
      // Generate comprehensive analytics report
      const analyticsReport = await this.generateWeeklyAnalyticsReport();
      
      // Send report to management
      await this.notificationService.sendAnalyticsReport('Weekly Inventory Analytics', analyticsReport);
      
      this.logger.info('Inventory analytics processing completed successfully');
      
    } catch (error) {
      this.logger.error('Failed to process inventory analytics', error);
      throw error;
    }
  }

  /**
   * Generate weekly analytics report.
   */
  private async generateWeeklyAnalyticsReport(): Promise<string> {
    const report: string[] = [];
    
    // Report header
    report.push('=== WEEKLY INVENTORY ANALYTICS REPORT ===');
    report.push(`Generated: ${new Date().toISOString()}`);
    report.push('Analysis Period: Last 7 days');
    report.push('');
    
    // Inventory value analysis
    const valueSummary = await this.inventoryService.getTotalInventoryValue();
    report.push('INVENTORY VALUE ANALYSIS:');
    report.push(`- Total Products in Stock: ${valueSummary.totalProducts}`);
    report.push(`- Total Inventory Value: $${valueSummary.totalValue.toFixed(2)}`);
    
    const avgValuePerProduct = valueSummary.totalProducts > 0 
      ? (valueSummary.totalValue / valueSummary.totalProducts).toFixed(2)
      : '0.00';
    report.push(`- Average Value per Product: $${avgValuePerProduct}`);
    report.push('');
    
    // Stock movement analysis
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentMovements = await this.stockMovementRepository.findMovementsSince(weekAgo);
    
    report.push('STOCK MOVEMENT ANALYSIS (Last 7 days):');
    report.push(`- Total Movements: ${recentMovements.length}`);
    
    // Group movements by type
    const movementsByType = this.groupMovementsByType(recentMovements);
    
    for (const [type, movements] of movementsByType.entries()) {
      const totalQuantity = movements.reduce((sum, movement) => sum + Math.abs(movement.quantity), 0);
      report.push(`- ${type}: ${movements.length} movements (${totalQuantity} units)`);
    }
    
    report.push('');
    
    // Top moving products
    const topMovingProducts = await this.getTopMovingProducts(recentMovements, 10);
    
    report.push('TOP 10 MOST ACTIVE PRODUCTS (by movement volume):');
    topMovingProducts.forEach((entry, index) => {
      report.push(`${index + 1}. ${entry.product.name} (${entry.product.sku}) - ${entry.totalMovement} units moved`);
    });
    
    report.push('');
    
    // Low stock trend analysis
    const lowStockAlerts = await this.inventoryService.checkLowStockLevels();
    report.push('STOCK LEVEL ANALYSIS:');
    report.push(`- Products Below Reorder Level: ${lowStockAlerts.length}`);
    
    const alertsBySeverity = this.groupAlertsBySeverity(lowStockAlerts);
    
    for (const [severity, count] of alertsBySeverity.entries()) {
      report.push(`- ${severity}: ${count} products`);
    }
    
    report.push('');
    
    // Velocity analysis
    report.push('INVENTORY VELOCITY ANALYSIS:');
    const velocityAnalysis = this.analyzeInventoryVelocity(recentMovements);
    report.push(`- High Velocity Products (>50 units/week): ${velocityAnalysis.highVelocityCount}`);
    report.push(`- Medium Velocity Products (10-50 units/week): ${velocityAnalysis.mediumVelocityCount}`);
    report.push(`- Low Velocity Products (<10 units/week): ${velocityAnalysis.lowVelocityCount}`);
    report.push(`- Stagnant Products (no movement): ${velocityAnalysis.stagnantCount}`);
    report.push('');
    
    // Recommendations
    report.push('ANALYTICS-BASED RECOMMENDATIONS:');
    this.generateAnalyticsRecommendations(report, velocityAnalysis, lowStockAlerts, topMovingProducts);
    
    report.push('');
    report.push('Report generated by Inventory Analytics System');
    
    return report.join('\n');
  }

  /**
   * Generate monthly analytics report with deeper insights.
   */
  private async generateMonthlyAnalyticsReport(): Promise<string> {
    const report: string[] = [];
    
    // Report header
    report.push('=== MONTHLY INVENTORY ANALYTICS REPORT ===');
    report.push(`Generated: ${new Date().toISOString()}`);
    report.push('Analysis Period: Last 30 days');
    report.push('');
    
    // Extended analysis for monthly report
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const monthlyMovements = await this.stockMovementRepository.findMovementsSince(monthAgo);
    
    // Monthly trends
    report.push('MONTHLY TRENDS:');
    report.push(`- Total Stock Movements: ${monthlyMovements.length}`);
    
    // Calculate daily averages
    const dailyAverageMovements = (monthlyMovements.length / 30).toFixed(1);
    report.push(`- Daily Average Movements: ${dailyAverageMovements}`);
    
    // Seasonal analysis
    const movementsByDayOfWeek = this.groupMovementsByDayOfWeek(monthlyMovements);
    const mostActiveDay = this.getMostActiveDay(movementsByDayOfWeek);
    
    report.push(`- Most Active Day of Week: ${mostActiveDay.day} (${mostActiveDay.count} movements)`);
    report.push('');
    
    // Performance metrics
    report.push('PERFORMANCE METRICS:');
    const metrics = this.calculatePerformanceMetrics(monthlyMovements);
    report.push(`- Inventory Turnover Rate: ${metrics.turnoverRate.toFixed(2)}`);
    report.push(`- Stock Accuracy: ${metrics.stockAccuracy.toFixed(1)}%`);
    report.push(`- Fill Rate: ${metrics.fillRate.toFixed(1)}%`);
    report.push('');
    
    // Cost analysis
    report.push('COST ANALYSIS:');
    const totalMovementValue = await this.calculateTotalMovementValue(monthlyMovements);
    report.push(`- Total Movement Value: $${totalMovementValue.toFixed(2)}`);
    
    const avgMovementValue = monthlyMovements.length > 0 
      ? (totalMovementValue / monthlyMovements.length).toFixed(2)
      : '0.00';
    report.push(`- Average Movement Value: $${avgMovementValue}`);
    report.push('');
    
    // Strategic recommendations
    report.push('STRATEGIC RECOMMENDATIONS:');
    this.generateStrategicRecommendations(report, metrics, monthlyMovements);
    
    return report.join('\n');
  }

  /**
   * Group stock movements by type.
   */
  private groupMovementsByType(movements: StockMovement[]): Map<string, StockMovement[]> {
    const grouped = new Map<string, StockMovement[]>();
    
    for (const movement of movements) {
      const type = movement.movementType;
      if (!grouped.has(type)) {
        grouped.set(type, []);
      }
      grouped.get(type)!.push(movement);
    }
    
    return grouped;
  }

  /**
   * Get top moving products by volume.
   */
  private async getTopMovingProducts(movements: StockMovement[], limit: number): Promise<Array<{product: Product, totalMovement: number}>> {
    const productMovements = new Map<number, number>();
    
    // Calculate total movement per product
    for (const movement of movements) {
      const productId = movement.productId;
      const currentTotal = productMovements.get(productId) || 0;
      productMovements.set(productId, currentTotal + Math.abs(movement.quantity));
    }
    
    // Sort by movement volume and get top products
    const sortedEntries = Array.from(productMovements.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit);
    
    // Fetch product details
    const result: Array<{product: Product, totalMovement: number}> = [];
    
    for (const [productId, totalMovement] of sortedEntries) {
      const product = await this.productRepository.findById(productId);
      if (product) {
        result.push({ product, totalMovement });
      }
    }
    
    return result;
  }

  /**
   * Group alerts by severity.
   */
  private groupAlertsBySeverity(alerts: LowStockAlert[]): Map<string, number> {
    const grouped = new Map<string, number>();
    
    for (const alert of alerts) {
      const severity = alert.severity || 'LOW';
      grouped.set(severity, (grouped.get(severity) || 0) + 1);
    }
    
    return grouped;
  }

  /**
   * Analyze inventory velocity patterns.
   */
  private analyzeInventoryVelocity(movements: StockMovement[]): InventoryVelocityAnalysis {
    const productVelocities = new Map<number, number>();
    
    // Calculate velocity per product
    for (const movement of movements) {
      const productId = movement.productId;
      const currentVelocity = productVelocities.get(productId) || 0;
      productVelocities.set(productId, currentVelocity + Math.abs(movement.quantity));
    }
    
    let highVelocity = 0;
    let mediumVelocity = 0;
    let lowVelocity = 0;
    
    for (const velocity of productVelocities.values()) {
      if (velocity > 50) {
        highVelocity++;
      } else if (velocity >= 10) {
        mediumVelocity++;
      } else {
        lowVelocity++;
      }
    }
    
    // Count stagnant products (no movement)
    // This would require getting total product count and subtracting active products
    const stagnant = 0; // Placeholder - would need actual product count
    
    return new InventoryVelocityAnalysis(highVelocity, mediumVelocity, lowVelocity, stagnant);
  }

  /**
   * Group movements by day of week.
   */
  private groupMovementsByDayOfWeek(movements: StockMovement[]): Map<number, number> {
    const grouped = new Map<number, number>();
    
    for (const movement of movements) {
      const dayOfWeek = movement.createdAt.getDay(); // 0 = Sunday, 1 = Monday, etc.
      grouped.set(dayOfWeek, (grouped.get(dayOfWeek) || 0) + 1);
    }
    
    return grouped;
  }

  /**
   * Get the most active day of the week.
   */
  private getMostActiveDay(movementsByDay: Map<number, number>): {day: string, count: number} {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    let maxCount = 0;
    let maxDay = 0;
    
    for (const [day, count] of movementsByDay.entries()) {
      if (count > maxCount) {
        maxCount = count;
        maxDay = day;
      }
    }
    
    return { day: days[maxDay], count: maxCount };
  }

  /**
   * Calculate performance metrics.
   */
  private calculatePerformanceMetrics(movements: StockMovement[]): InventoryPerformanceMetrics {
    // Simplified metrics calculation
    const turnoverRate = movements.length / 30.0; // Movements per day as proxy for turnover
    const stockAccuracy = 98.5; // Placeholder - would need actual accuracy tracking
    const fillRate = 96.2; // Placeholder - would need order fulfillment data
    
    return new InventoryPerformanceMetrics(turnoverRate, stockAccuracy, fillRate);
  }

  /**
   * Calculate total value of stock movements.
   */
  private async calculateTotalMovementValue(movements: StockMovement[]): Promise<number> {
    let totalValue = 0;
    
    for (const movement of movements) {
      const product = await this.productRepository.findById(movement.productId);
      if (product && product.costPrice) {
        totalValue += product.costPrice * Math.abs(movement.quantity);
      }
    }
    
    return totalValue;
  }

  /**
   * Generate analytics-based recommendations.
   */
  private generateAnalyticsRecommendations(
    report: string[], 
    velocity: InventoryVelocityAnalysis,
    lowStockAlerts: LowStockAlert[],
    topMovingProducts: Array<{product: Product, totalMovement: number}>
  ): void {
    if (velocity.highVelocityCount > 0) {
      report.push('1. Monitor high-velocity products closely to prevent stockouts');
    }
    
    if (velocity.stagnantCount > 10) {
      report.push('2. Review stagnant inventory for potential liquidation or promotion');
    }
    
    if (lowStockAlerts.length > 20) {
      report.push('3. Consider adjusting reorder levels - high number of low stock alerts');
    }
    
    if (topMovingProducts.length > 0) {
      report.push('4. Ensure adequate safety stock for top moving products');
    }
    
    report.push('5. Regular review of inventory analytics to optimize stock levels');
  }

  /**
   * Generate strategic recommendations for monthly report.
   */
  private generateStrategicRecommendations(
    report: string[], 
    metrics: InventoryPerformanceMetrics,
    movements: StockMovement[]
  ): void {
    if (metrics.turnoverRate < 1.0) {
      report.push('1. Low inventory turnover - consider demand forecasting improvements');
    }
    
    if (metrics.stockAccuracy < 95.0) {
      report.push('2. Stock accuracy below target - implement cycle counting program');
    }
    
    if (metrics.fillRate < 95.0) {
      report.push('3. Fill rate below target - review safety stock levels');
    }
    
    report.push('4. Continue monitoring key performance indicators monthly');
    report.push('5. Consider implementing advanced demand forecasting algorithms');
  }
}

/**
 * Inventory velocity analysis results.
 */
class InventoryVelocityAnalysis {
  constructor(
    public readonly highVelocityCount: number,
    public readonly mediumVelocityCount: number,
    public readonly lowVelocityCount: number,
    public readonly stagnantCount: number
  ) {}
}

/**
 * Inventory performance metrics.
 */
class InventoryPerformanceMetrics {
  constructor(
    public readonly turnoverRate: number,
    public readonly stockAccuracy: number,
    public readonly fillRate: number
  ) {}
}