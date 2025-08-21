import React from 'react';
import {View, StyleSheet, TouchableOpacity} from 'react-native';
import {Text, Card, Chip, IconButton} from 'react-native-paper';
import {Order, OrderStatus} from '@ecommerce/shared/types';
import {theme} from '@/constants/theme';
import {format} from 'date-fns';

interface OrderCardProps {
  order: Order;
  onPress: (order: Order) => void;
  onStatusUpdate?: (orderId: string, status: OrderStatus) => void;
  showActions?: boolean;
}

const getStatusColor = (status: OrderStatus): string => {
  switch (status) {
    case 'PENDING':
      return theme.colors.warning;
    case 'CONFIRMED':
      return theme.colors.info;
    case 'PROCESSING':
      return theme.colors.primary;
    case 'SHIPPED':
      return theme.colors.secondary;
    case 'DELIVERED':
      return theme.colors.success;
    case 'CANCELLED':
    case 'REFUNDED':
      return theme.colors.error;
    default:
      return theme.colors.outline;
  }
};

const getStatusIcon = (status: OrderStatus): string => {
  switch (status) {
    case 'PENDING':
      return 'clock-outline';
    case 'CONFIRMED':
      return 'check-circle-outline';
    case 'PROCESSING':
      return 'cog-outline';
    case 'SHIPPED':
      return 'truck-outline';
    case 'DELIVERED':
      return 'package-variant';
    case 'CANCELLED':
      return 'close-circle-outline';
    case 'REFUNDED':
      return 'cash-refund';
    default:
      return 'help-circle-outline';
  }
};

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  onPress,
  onStatusUpdate,
  showActions = false,
}) => {
  const handleStatusUpdate = (newStatus: OrderStatus) => {
    if (onStatusUpdate) {
      onStatusUpdate(order.id, newStatus);
    }
  };

  const getNextStatus = (currentStatus: OrderStatus): OrderStatus | null => {
    switch (currentStatus) {
      case 'PENDING':
        return 'CONFIRMED';
      case 'CONFIRMED':
        return 'PROCESSING';
      case 'PROCESSING':
        return 'SHIPPED';
      case 'SHIPPED':
        return 'DELIVERED';
      default:
        return null;
    }
  };

  const nextStatus = getNextStatus(order.status);
  const canAdvanceStatus = nextStatus && showActions;

  return (
    <TouchableOpacity onPress={() => onPress(order)} activeOpacity={0.7}>
      <Card style={styles.card} mode="outlined">
        <Card.Content>
          <View style={styles.header}>
            <View style={styles.orderInfo}>
              <Text variant="titleMedium" style={styles.orderNumber}>
                #{order.orderNumber}
              </Text>
              <Text variant="bodySmall" style={styles.date}>
                {format(new Date(order.createdAt), 'MMM dd, yyyy HH:mm')}
              </Text>
            </View>
            <Chip
              icon={getStatusIcon(order.status)}
              style={[styles.statusChip, {backgroundColor: getStatusColor(order.status)}]}
              textStyle={styles.statusText}
              compact
            >
              {order.status}
            </Chip>
          </View>

          <View style={styles.content}>
            <View style={styles.row}>
              <Text variant="bodyMedium" style={styles.label}>
                Items:
              </Text>
              <Text variant="bodyMedium" style={styles.value}>
                {order.items?.length || 0}
              </Text>
            </View>

            <View style={styles.row}>
              <Text variant="bodyMedium" style={styles.label}>
                Total:
              </Text>
              <Text variant="titleMedium" style={styles.totalAmount}>
                ${order.totalAmount.toFixed(2)}
              </Text>
            </View>

            {order.customer && (
              <View style={styles.row}>
                <Text variant="bodyMedium" style={styles.label}>
                  Customer:
                </Text>
                <Text variant="bodyMedium" style={styles.value}>
                  {order.customer.firstName} {order.customer.lastName}
                </Text>
              </View>
            )}

            {order.supplier && (
              <View style={styles.row}>
                <Text variant="bodyMedium" style={styles.label}>
                  Supplier:
                </Text>
                <Text variant="bodyMedium" style={styles.value}>
                  {order.supplier.name}
                </Text>
              </View>
            )}
          </View>

          {canAdvanceStatus && (
            <View style={styles.actions}>
              <IconButton
                icon="arrow-right-circle"
                size={24}
                iconColor={theme.colors.primary}
                onPress={() => handleStatusUpdate(nextStatus)}
                style={styles.actionButton}
              />
              <Text variant="bodySmall" style={styles.actionText}>
                Mark as {nextStatus}
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  date: {
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  statusChip: {
    marginLeft: 8,
  },
  statusText: {
    color: theme.colors.onPrimary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: theme.colors.onSurfaceVariant,
  },
  value: {
    fontWeight: '500',
  },
  totalAmount: {
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outline,
  },
  actionButton: {
    margin: 0,
  },
  actionText: {
    marginLeft: 8,
    color: theme.colors.primary,
    fontWeight: '500',
  },
});