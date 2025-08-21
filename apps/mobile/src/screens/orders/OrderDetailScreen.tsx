import React, {useEffect, useState} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Share,
} from 'react-native';
import {
  Text,
  Card,
  Chip,
  Button,
  IconButton,
  Divider,
  List,
  Menu,
  Portal,
  Dialog,
  RadioButton,
} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import {RouteProp, useRoute, useNavigation} from '@react-navigation/native';
import {theme} from '@/constants/theme';
import {useOrders} from '@/hooks/useOrders';
import {LoadingSpinner, EmptyState} from '@/components/common';
import {Order, OrderStatus, OrderItem} from '@ecommerce/shared/types';
import {format} from 'date-fns';

type OrderDetailRouteProp = RouteProp<{OrderDetail: {orderId: string}}, 'OrderDetail'>;

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

const getAvailableStatusTransitions = (currentStatus: OrderStatus): OrderStatus[] => {
  switch (currentStatus) {
    case 'PENDING':
      return ['CONFIRMED', 'CANCELLED'];
    case 'CONFIRMED':
      return ['PROCESSING', 'CANCELLED'];
    case 'PROCESSING':
      return ['SHIPPED', 'CANCELLED'];
    case 'SHIPPED':
      return ['DELIVERED'];
    case 'DELIVERED':
      return ['REFUNDED'];
    default:
      return [];
  }
};

export const OrderDetailScreen: React.FC = () => {
  const route = useRoute<OrderDetailRouteProp>();
  const navigation = useNavigation();
  const {orderId} = route.params;

  const [menuVisible, setMenuVisible] = useState(false);
  const [statusDialogVisible, setStatusDialogVisible] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | null>(null);

  const {
    order,
    isLoading,
    error,
    updateOrderStatus,
    fetchOrder,
  } = useOrders();

  useEffect(() => {
    if (orderId) {
      fetchOrder(orderId);
    }
  }, [orderId, fetchOrder]);

  const handleStatusUpdate = async () => {
    if (!selectedStatus || !order) return;

    try {
      await updateOrderStatus(order.id, {
        status: selectedStatus,
        notifyCustomer: true,
      });
      setStatusDialogVisible(false);
      setSelectedStatus(null);
    } catch (error) {
      console.error('Failed to update order status:', error);
    }
  };

  const handleShare = async () => {
    if (!order) return;

    try {
      const message = `Order #${order.orderNumber}\nStatus: ${order.status}\nTotal: $${order.totalAmount.toFixed(2)}\nItems: ${order.items.length}`;
      
      await Share.share({
        message,
        title: `Order #${order.orderNumber}`,
      });
    } catch (error) {
      console.error('Failed to share order:', error);
    }
    setMenuVisible(false);
  };

  const handleEdit = () => {
    if (order && ['PENDING', 'CONFIRMED'].includes(order.status)) {
      navigation.navigate('EditOrder', {orderId: order.id});
    } else {
      Alert.alert(
        'Cannot Edit Order',
        'Orders can only be edited when they are in PENDING or CONFIRMED status.'
      );
    }
    setMenuVisible(false);
  };

  const renderOrderItem = (item: OrderItem, index: number) => (
    <View key={item.id} style={styles.orderItem}>
      <View style={styles.itemHeader}>
        <Text variant="titleMedium" style={styles.itemName}>
          {item.product?.name || `Product ${item.productId}`}
        </Text>
        <Text variant="titleMedium" style={styles.itemTotal}>
          ${item.totalPrice.toFixed(2)}
        </Text>
      </View>
      <View style={styles.itemDetails}>
        <Text variant="bodyMedium" style={styles.itemDetail}>
          Quantity: {item.quantity}
        </Text>
        <Text variant="bodyMedium" style={styles.itemDetail}>
          Unit Price: ${item.unitPrice.toFixed(2)}
        </Text>
      </View>
      {item.product?.sku && (
        <Text variant="bodySmall" style={styles.itemSku}>
          SKU: {item.product.sku}
        </Text>
      )}
      {index < order!.items.length - 1 && <Divider style={styles.itemDivider} />}
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState
          icon="alert-circle"
          title="Error Loading Order"
          description={error?.message || 'Order not found'}
          actionLabel="Go Back"
          onAction={() => navigation.goBack()}
        />
      </SafeAreaView>
    );
  }

  const availableStatuses = getAvailableStatusTransitions(order.status);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Card */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.header}>
              <View style={styles.orderInfo}>
                <Text variant="headlineSmall" style={styles.orderNumber}>
                  #{order.orderNumber}
                </Text>
                <Text variant="bodyMedium" style={styles.orderDate}>
                  {format(new Date(order.createdAt), 'MMMM dd, yyyy HH:mm')}
                </Text>
              </View>
              <Menu
                visible={menuVisible}
                onDismiss={() => setMenuVisible(false)}
                anchor={
                  <IconButton
                    icon="dots-vertical"
                    size={24}
                    onPress={() => setMenuVisible(true)}
                  />
                }
              >
                <Menu.Item onPress={handleEdit} title="Edit Order" />
                <Menu.Item onPress={handleShare} title="Share Order" />
                <Divider />
                <Menu.Item
                  onPress={() => setMenuVisible(false)}
                  title="Cancel"
                />
              </Menu>
            </View>

            <View style={styles.statusContainer}>
              <Chip
                icon={getStatusIcon(order.status)}
                style={[styles.statusChip, {backgroundColor: getStatusColor(order.status)}]}
                textStyle={styles.statusText}
              >
                {order.status}
              </Chip>
              {availableStatuses.length > 0 && (
                <Button
                  mode="outlined"
                  onPress={() => setStatusDialogVisible(true)}
                  style={styles.statusButton}
                  compact
                >
                  Update Status
                </Button>
              )}
            </View>
          </Card.Content>
        </Card>

        {/* Customer/Supplier Info */}
        {(order.customer || order.supplier) && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                {order.customer ? 'Customer' : 'Supplier'} Information
              </Text>
              {order.customer && (
                <View style={styles.contactInfo}>
                  <Text variant="bodyLarge" style={styles.contactName}>
                    {order.customer.firstName} {order.customer.lastName}
                  </Text>
                  <Text variant="bodyMedium">{order.customer.email}</Text>
                  {order.customer.phone && (
                    <Text variant="bodyMedium">{order.customer.phone}</Text>
                  )}
                  {order.customer.address && (
                    <Text variant="bodyMedium" style={styles.address}>
                      {order.customer.address}
                      {order.customer.city && `, ${order.customer.city}`}
                      {order.customer.country && `, ${order.customer.country}`}
                    </Text>
                  )}
                </View>
              )}
              {order.supplier && (
                <View style={styles.contactInfo}>
                  <Text variant="bodyLarge" style={styles.contactName}>
                    {order.supplier.name}
                  </Text>
                  <Text variant="bodyMedium">{order.supplier.email}</Text>
                  <Text variant="bodyMedium">{order.supplier.phone}</Text>
                  <Text variant="bodyMedium" style={styles.address}>
                    {order.supplier.address}, {order.supplier.city}, {order.supplier.country}
                  </Text>
                </View>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Order Items */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Order Items ({order.items.length})
            </Text>
            {order.items.map((item, index) => renderOrderItem(item, index))}
          </Card.Content>
        </Card>

        {/* Order Summary */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Order Summary
            </Text>
            <View style={styles.summaryRow}>
              <Text variant="bodyLarge">Total Amount:</Text>
              <Text variant="headlineSmall" style={styles.totalAmount}>
                ${order.totalAmount.toFixed(2)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text variant="bodyMedium">Items Count:</Text>
              <Text variant="bodyMedium">{order.items.length}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text variant="bodyMedium">Created:</Text>
              <Text variant="bodyMedium">
                {format(new Date(order.createdAt), 'MMM dd, yyyy HH:mm')}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text variant="bodyMedium">Last Updated:</Text>
              <Text variant="bodyMedium">
                {format(new Date(order.updatedAt), 'MMM dd, yyyy HH:mm')}
              </Text>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Status Update Dialog */}
      <Portal>
        <Dialog
          visible={statusDialogVisible}
          onDismiss={() => setStatusDialogVisible(false)}
        >
          <Dialog.Title>Update Order Status</Dialog.Title>
          <Dialog.Content>
            <RadioButton.Group
              onValueChange={(value) => setSelectedStatus(value as OrderStatus)}
              value={selectedStatus || ''}
            >
              {availableStatuses.map((status) => (
                <RadioButton.Item
                  key={status}
                  label={status}
                  value={status}
                  style={styles.radioItem}
                />
              ))}
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setStatusDialogVisible(false)}>Cancel</Button>
            <Button
              onPress={handleStatusUpdate}
              disabled={!selectedStatus}
              mode="contained"
            >
              Update
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  orderDate: {
    color: theme.colors.onSurfaceVariant,
    marginTop: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusChip: {
    alignSelf: 'flex-start',
  },
  statusText: {
    color: theme.colors.onPrimary,
    fontWeight: 'bold',
  },
  statusButton: {
    borderColor: theme.colors.primary,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
    color: theme.colors.primary,
  },
  contactInfo: {
    gap: 4,
  },
  contactName: {
    fontWeight: 'bold',
  },
  address: {
    fontStyle: 'italic',
    color: theme.colors.onSurfaceVariant,
  },
  orderItem: {
    paddingVertical: 8,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  itemName: {
    flex: 1,
    fontWeight: 'bold',
  },
  itemTotal: {
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  itemDetail: {
    color: theme.colors.onSurfaceVariant,
  },
  itemSku: {
    color: theme.colors.onSurfaceVariant,
    fontStyle: 'italic',
  },
  itemDivider: {
    marginTop: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalAmount: {
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  radioItem: {
    paddingVertical: 4,
  },
});