import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { theme } from '../../constants/theme';
import type { Inventory } from '@ecommerce/shared/types';

interface InventoryCardProps {
  item: Inventory;
  onPress: () => void;
  onStockAdjustment: () => void;
}

export const InventoryCard: React.FC<InventoryCardProps> = ({
  item,
  onPress,
  onStockAdjustment,
}) => {
  const isLowStock = item.quantity <= item.reorderLevel;
  const stockPercentage = Math.min((item.quantity / item.maxStockLevel) * 100, 100);
  
  const getStockStatusColor = () => {
    if (item.quantity === 0) return theme.colors.error;
    if (isLowStock) return theme.colors.warning;
    if (stockPercentage > 80) return theme.colors.success;
    return theme.colors.info;
  };

  const getStockStatusText = () => {
    if (item.quantity === 0) return 'Out of Stock';
    if (isLowStock) return 'Low Stock';
    if (stockPercentage > 80) return 'Well Stocked';
    return 'In Stock';
  };

  const handleQuickAdjustment = (type: 'increase' | 'decrease') => {
    const title = type === 'increase' ? 'Increase Stock' : 'Decrease Stock';
    const message = `How many items would you like to ${type}?`;
    
    Alert.prompt(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: (value) => {
            const quantity = parseInt(value || '0');
            if (quantity > 0) {
              // This would trigger a quick adjustment
              onStockAdjustment();
            }
          },
        },
      ],
      'plain-text',
      '1',
      'numeric'
    );
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.product?.name || 'Unknown Product'}
          </Text>
          <Text style={styles.productSku}>
            SKU: {item.product?.sku || 'N/A'}
          </Text>
        </View>
        
        <View style={[styles.statusBadge, { backgroundColor: getStockStatusColor() }]}>
          <Text style={styles.statusText}>{getStockStatusText()}</Text>
        </View>
      </View>

      <View style={styles.stockInfo}>
        <View style={styles.stockNumbers}>
          <View style={styles.stockItem}>
            <Text style={styles.stockLabel}>Current</Text>
            <Text style={[styles.stockValue, { color: getStockStatusColor() }]}>
              {item.quantity}
            </Text>
          </View>
          
          <View style={styles.stockItem}>
            <Text style={styles.stockLabel}>Reserved</Text>
            <Text style={styles.stockValue}>{item.reservedQuantity}</Text>
          </View>
          
          <View style={styles.stockItem}>
            <Text style={styles.stockLabel}>Available</Text>
            <Text style={styles.stockValue}>
              {Math.max(0, item.quantity - item.reservedQuantity)}
            </Text>
          </View>
          
          <View style={styles.stockItem}>
            <Text style={styles.stockLabel}>Reorder</Text>
            <Text style={styles.stockValue}>{item.reorderLevel}</Text>
          </View>
        </View>

        {/* Stock Level Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(stockPercentage, 100)}%`,
                  backgroundColor: getStockStatusColor(),
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {stockPercentage.toFixed(0)}% of max capacity
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.productDetails}>
          <Text style={styles.categoryText}>
            {item.product?.category?.name || 'Uncategorized'}
          </Text>
          <Text style={styles.priceText}>
            ${item.product?.price?.toFixed(2) || '0.00'}
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.decreaseButton]}
            onPress={() => handleQuickAdjustment('decrease')}
            disabled={item.quantity === 0}
          >
            <Icon name="remove" size={16} color={theme.colors.white} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.adjustButton]}
            onPress={onStockAdjustment}
          >
            <Icon name="edit" size={16} color={theme.colors.white} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.increaseButton]}
            onPress={() => handleQuickAdjustment('increase')}
          >
            <Icon name="add" size={16} color={theme.colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Low Stock Warning */}
      {isLowStock && item.quantity > 0 && (
        <View style={styles.warningBanner}>
          <Icon name="warning" size={16} color={theme.colors.warning} />
          <Text style={styles.warningText}>
            Stock is running low. Consider reordering soon.
          </Text>
        </View>
      )}

      {/* Out of Stock Warning */}
      {item.quantity === 0 && (
        <View style={[styles.warningBanner, styles.errorBanner]}>
          <Icon name="error" size={16} color={theme.colors.error} />
          <Text style={[styles.warningText, styles.errorText]}>
            Out of stock! Immediate restocking required.
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.sm,
    shadowColor: theme.colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  productInfo: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  productSku: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.white,
    textTransform: 'uppercase',
  },
  stockInfo: {
    marginBottom: theme.spacing.md,
  },
  stockNumbers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  stockItem: {
    alignItems: 'center',
  },
  stockLabel: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    textTransform: 'uppercase',
  },
  stockValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  progressContainer: {
    marginTop: theme.spacing.sm,
  },
  progressBar: {
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productDetails: {
    flex: 1,
  },
  categoryText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  priceText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  decreaseButton: {
    backgroundColor: theme.colors.error,
  },
  adjustButton: {
    backgroundColor: theme.colors.info,
  },
  increaseButton: {
    backgroundColor: theme.colors.success,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.warningContainer,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    marginTop: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  errorBanner: {
    backgroundColor: theme.colors.errorContainer,
  },
  warningText: {
    flex: 1,
    fontSize: 11,
    color: theme.colors.warning,
  },
  errorText: {
    color: theme.colors.error,
  },
});