import React, {useState, useCallback} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  TextInput,
  IconButton,
  Divider,
  List,
  Portal,
  Modal,
  Searchbar,
  Chip,
} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useForm, Controller, useFieldArray} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {theme} from '@/constants/theme';
import {useOrders} from '@/hooks/useOrders';
import {LoadingSpinner} from '@/components/common';
import {Product} from '@ecommerce/shared/types';
import {OrderCreateSchema, OrderCreateDTO, OrderItemCreateDTO} from '@ecommerce/validation';

interface OrderFormData {
  items: OrderItemCreateDTO[];
  notes?: string;
}

interface ProductSelectorProps {
  visible: boolean;
  onDismiss: () => void;
  onSelect: (product: Product) => void;
  selectedProductIds: string[];
}

const ProductSelector: React.FC<ProductSelectorProps> = ({
  visible,
  onDismiss,
  onSelect,
  selectedProductIds,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  // In a real app, you'd fetch products here
  const [products] = useState<Product[]>([]);

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContent}
      >
        <Text variant="headlineSmall" style={styles.modalTitle}>
          Select Product
        </Text>
        
        <Searchbar
          placeholder="Search products..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />

        <ScrollView style={styles.productList}>
          {filteredProducts.map((product) => {
            const isSelected = selectedProductIds.includes(product.id);
            return (
              <List.Item
                key={product.id}
                title={product.name}
                description={`SKU: ${product.sku} | $${product.price.toFixed(2)}`}
                left={(props) => (
                  <List.Icon
                    {...props}
                    icon={isSelected ? 'check-circle' : 'circle-outline'}
                    color={isSelected ? theme.colors.primary : theme.colors.onSurface}
                  />
                )}
                onPress={() => {
                  if (!isSelected) {
                    onSelect(product);
                  }
                }}
                disabled={isSelected}
                style={[
                  styles.productItem,
                  isSelected && styles.selectedProductItem,
                ]}
              />
            );
          })}
          {filteredProducts.length === 0 && (
            <View style={styles.emptyProducts}>
              <Text variant="bodyMedium">No products found</Text>
            </View>
          )}
        </ScrollView>

        <Button mode="outlined" onPress={onDismiss} style={styles.modalButton}>
          Close
        </Button>
      </Modal>
    </Portal>
  );
};

export const CreateOrderScreen: React.FC = () => {
  const navigation = useNavigation();
  const [productSelectorVisible, setProductSelectorVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {createOrder} = useOrders();

  const {
    control,
    handleSubmit,
    formState: {errors, isValid},
    watch,
    setValue,
  } = useForm<OrderFormData>({
    resolver: zodResolver(OrderCreateSchema),
    defaultValues: {
      items: [],
      notes: '',
    },
    mode: 'onChange',
  });

  const {fields, append, remove, update} = useFieldArray({
    control,
    name: 'items',
  });

  const watchedItems = watch('items');

  const calculateTotal = useCallback(() => {
    return watchedItems.reduce((total, item) => {
      const quantity = item.quantity || 0;
      const unitPrice = item.unitPrice || 0;
      return total + (quantity * unitPrice);
    }, 0);
  }, [watchedItems]);

  const handleProductSelect = useCallback((product: Product) => {
    append({
      productId: product.id,
      quantity: 1,
      unitPrice: product.price,
    });
    setProductSelectorVisible(false);
  }, [append]);

  const handleQuantityChange = useCallback((index: number, quantity: string) => {
    const numQuantity = parseInt(quantity) || 0;
    const currentItem = watchedItems[index];
    if (currentItem) {
      update(index, {
        ...currentItem,
        quantity: numQuantity,
      });
    }
  }, [watchedItems, update]);

  const handleUnitPriceChange = useCallback((index: number, price: string) => {
    const numPrice = parseFloat(price) || 0;
    const currentItem = watchedItems[index];
    if (currentItem) {
      update(index, {
        ...currentItem,
        unitPrice: numPrice,
      });
    }
  }, [watchedItems, update]);

  const handleRemoveItem = useCallback((index: number) => {
    Alert.alert(
      'Remove Item',
      'Are you sure you want to remove this item from the order?',
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Remove', style: 'destructive', onPress: () => remove(index)},
      ]
    );
  }, [remove]);

  const onSubmit = async (data: OrderFormData) => {
    if (data.items.length === 0) {
      Alert.alert('Error', 'Please add at least one item to the order');
      return;
    }

    setIsSubmitting(true);
    try {
      const order = await createOrder(data);
      Alert.alert(
        'Success',
        `Order #${order.orderNumber} has been created successfully`,
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('OrderDetail', {orderId: order.id}),
          },
        ]
      );
    } catch (error) {
      console.error('Failed to create order:', error);
      Alert.alert('Error', 'Failed to create order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedProductIds = watchedItems.map(item => item.productId);
  const totalAmount = calculateTotal();

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Order Items Section */}
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.sectionHeader}>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Order Items
                </Text>
                <Button
                  mode="outlined"
                  onPress={() => setProductSelectorVisible(true)}
                  icon="plus"
                  compact
                >
                  Add Item
                </Button>
              </View>

              {fields.length === 0 ? (
                <View style={styles.emptyItems}>
                  <Text variant="bodyMedium" style={styles.emptyText}>
                    No items added yet. Tap "Add Item" to get started.
                  </Text>
                </View>
              ) : (
                fields.map((field, index) => {
                  const item = watchedItems[index];
                  const itemTotal = (item?.quantity || 0) * (item?.unitPrice || 0);

                  return (
                    <View key={field.id} style={styles.orderItem}>
                      <View style={styles.itemHeader}>
                        <Text variant="titleSmall" style={styles.itemTitle}>
                          Product {index + 1}
                        </Text>
                        <IconButton
                          icon="close"
                          size={20}
                          onPress={() => handleRemoveItem(index)}
                          style={styles.removeButton}
                        />
                      </View>

                      <View style={styles.itemInputs}>
                        <Controller
                          control={control}
                          name={`items.${index}.quantity`}
                          render={({field: {value, onBlur}}) => (
                            <TextInput
                              label="Quantity"
                              value={value?.toString() || ''}
                              onChangeText={(text) => handleQuantityChange(index, text)}
                              onBlur={onBlur}
                              keyboardType="numeric"
                              style={styles.quantityInput}
                              error={!!errors.items?.[index]?.quantity}
                            />
                          )}
                        />

                        <Controller
                          control={control}
                          name={`items.${index}.unitPrice`}
                          render={({field: {value, onBlur}}) => (
                            <TextInput
                              label="Unit Price"
                              value={value?.toString() || ''}
                              onChangeText={(text) => handleUnitPriceChange(index, text)}
                              onBlur={onBlur}
                              keyboardType="decimal-pad"
                              style={styles.priceInput}
                              left={<TextInput.Affix text="$" />}
                              error={!!errors.items?.[index]?.unitPrice}
                            />
                          )}
                        />
                      </View>

                      <View style={styles.itemSummary}>
                        <Text variant="bodyMedium">
                          Total: ${itemTotal.toFixed(2)}
                        </Text>
                      </View>

                      {index < fields.length - 1 && <Divider style={styles.itemDivider} />}
                    </View>
                  );
                })
              )}
            </Card.Content>
          </Card>

          {/* Notes Section */}
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Order Notes
              </Text>
              <Controller
                control={control}
                name="notes"
                render={({field: {value, onChange, onBlur}}) => (
                  <TextInput
                    label="Notes (Optional)"
                    value={value || ''}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    multiline
                    numberOfLines={3}
                    style={styles.notesInput}
                    placeholder="Add any special instructions or notes..."
                  />
                )}
              />
            </Card.Content>
          </Card>

          {/* Order Summary */}
          {fields.length > 0 && (
            <Card style={styles.card}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Order Summary
                </Text>
                <View style={styles.summaryRow}>
                  <Text variant="bodyLarge">Items:</Text>
                  <Text variant="bodyLarge">{fields.length}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text variant="headlineSmall" style={styles.totalLabel}>
                    Total Amount:
                  </Text>
                  <Text variant="headlineSmall" style={styles.totalAmount}>
                    ${totalAmount.toFixed(2)}
                  </Text>
                </View>
              </Card.Content>
            </Card>
          )}
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            style={styles.actionButton}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            style={styles.actionButton}
            disabled={!isValid || fields.length === 0 || isSubmitting}
            loading={isSubmitting}
          >
            Create Order
          </Button>
        </View>

        <ProductSelector
          visible={productSelectorVisible}
          onDismiss={() => setProductSelectorVisible(false)}
          onSelect={handleProductSelect}
          selectedProductIds={selectedProductIds}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  emptyItems: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  orderItem: {
    marginBottom: 16,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemTitle: {
    fontWeight: 'bold',
  },
  removeButton: {
    margin: 0,
  },
  itemInputs: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  quantityInput: {
    flex: 1,
  },
  priceInput: {
    flex: 1,
  },
  itemSummary: {
    alignItems: 'flex-end',
  },
  itemDivider: {
    marginTop: 8,
  },
  notesInput: {
    marginTop: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalLabel: {
    fontWeight: 'bold',
  },
  totalAmount: {
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outline,
  },
  actionButton: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    margin: 20,
    borderRadius: 8,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  searchbar: {
    marginBottom: 16,
  },
  productList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  productItem: {
    paddingVertical: 8,
  },
  selectedProductItem: {
    backgroundColor: theme.colors.primaryContainer,
  },
  emptyProducts: {
    padding: 20,
    alignItems: 'center',
  },
  modalButton: {
    marginTop: 8,
  },
});