import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Toast from 'react-native-toast-message';

import { StockAdjustmentSchema, type StockAdjustmentDTO } from '@ecommerce/validation';
import { StockMovementType } from '@ecommerce/shared/types';
import { useInventory } from '../../hooks/useInventory';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { theme } from '../../constants/theme';

interface RouteParams {
  productId: string;
  currentQuantity: number;
}

const StockAdjustmentScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { productId, currentQuantity } = route.params as RouteParams;
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedType, setSelectedType] = useState<StockMovementType>(StockMovementType.ADJUSTMENT_INCREASE);
  
  const { adjustStock, getProductById } = useInventory();
  const [product, setProduct] = useState(null);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<StockAdjustmentDTO>({
    resolver: zodResolver(StockAdjustmentSchema),
    defaultValues: {
      productId,
      type: StockMovementType.ADJUSTMENT_INCREASE,
      quantity: 1,
      reason: '',
    },
    mode: 'onChange',
  });

  const watchedQuantity = watch('quantity');
  const watchedType = watch('type');

  useEffect(() => {
    const loadProduct = async () => {
      try {
        const productData = await getProductById(productId);
        setProduct(productData);
      } catch (error) {
        console.error('Failed to load product:', error);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to load product details',
        });
      }
    };

    loadProduct();
  }, [productId, getProductById]);

  const adjustmentTypes = [
    {
      type: StockMovementType.ADJUSTMENT_INCREASE,
      label: 'Increase Stock',
      icon: 'add',
      color: theme.colors.success,
      description: 'Add items to inventory',
    },
    {
      type: StockMovementType.ADJUSTMENT_DECREASE,
      label: 'Decrease Stock',
      icon: 'remove',
      color: theme.colors.warning,
      description: 'Remove items from inventory',
    },
    {
      type: StockMovementType.DAMAGE,
      label: 'Damaged Items',
      icon: 'broken-image',
      color: theme.colors.error,
      description: 'Mark items as damaged',
    },
    {
      type: StockMovementType.LOST,
      label: 'Lost Items',
      icon: 'help-outline',
      color: theme.colors.error,
      description: 'Mark items as lost',
    },
    {
      type: StockMovementType.EXPIRED,
      label: 'Expired Items',
      icon: 'schedule',
      color: theme.colors.error,
      description: 'Mark items as expired',
    },
  ];

  const calculateNewQuantity = useCallback(() => {
    if (!watchedQuantity) return currentQuantity;
    
    switch (watchedType) {
      case StockMovementType.ADJUSTMENT_INCREASE:
        return currentQuantity + watchedQuantity;
      case StockMovementType.ADJUSTMENT_DECREASE:
      case StockMovementType.DAMAGE:
      case StockMovementType.LOST:
      case StockMovementType.EXPIRED:
        return Math.max(0, currentQuantity - watchedQuantity);
      default:
        return currentQuantity;
    }
  }, [currentQuantity, watchedQuantity, watchedType]);

  const handleTypeSelect = useCallback((type: StockMovementType) => {
    setSelectedType(type);
    setValue('type', type);
  }, [setValue]);

  const onSubmit = useCallback(async (data: StockAdjustmentDTO) => {
    if (isSubmitting) return;

    // Validate that we don't go below 0 for decrease operations
    const newQuantity = calculateNewQuantity();
    if (newQuantity < 0) {
      Alert.alert(
        'Invalid Quantity',
        'Cannot reduce stock below zero. Please adjust the quantity.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsSubmitting(true);

    try {
      await adjustStock(data);
      
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Stock adjustment completed successfully',
      });

      navigation.goBack();
    } catch (error) {
      console.error('Stock adjustment failed:', error);
      
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Failed to adjust stock',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, calculateNewQuantity, adjustStock, navigation]);

  const renderTypeSelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Adjustment Type</Text>
      <View style={styles.typeGrid}>
        {adjustmentTypes.map((item) => (
          <TouchableOpacity
            key={item.type}
            style={[
              styles.typeCard,
              selectedType === item.type && styles.typeCardSelected,
            ]}
            onPress={() => handleTypeSelect(item.type)}
          >
            <Icon
              name={item.icon}
              size={24}
              color={selectedType === item.type ? theme.colors.white : item.color}
            />
            <Text
              style={[
                styles.typeLabel,
                selectedType === item.type && styles.typeLabelSelected,
              ]}
            >
              {item.label}
            </Text>
            <Text
              style={[
                styles.typeDescription,
                selectedType === item.type && styles.typeDescriptionSelected,
              ]}
            >
              {item.description}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (!product) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Product Info */}
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{product.name}</Text>
            <Text style={styles.productSku}>SKU: {product.sku}</Text>
            <View style={styles.stockInfo}>
              <Text style={styles.currentStock}>Current Stock: {currentQuantity}</Text>
              <Text style={styles.newStock}>
                New Stock: {calculateNewQuantity()}
              </Text>
            </View>
          </View>

          {renderTypeSelector()}

          {/* Quantity Input */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quantity</Text>
            <Controller
              control={control}
              name="quantity"
              render={({ field: { onChange, value } }) => (
                <View style={styles.quantityContainer}>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => onChange(Math.max(1, value - 1))}
                  >
                    <Icon name="remove" size={20} color={theme.colors.text} />
                  </TouchableOpacity>
                  
                  <TextInput
                    style={styles.quantityInput}
                    value={value?.toString() || ''}
                    onChangeText={(text) => {
                      const num = parseInt(text) || 0;
                      onChange(Math.max(0, num));
                    }}
                    keyboardType="numeric"
                    textAlign="center"
                  />
                  
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => onChange(value + 1)}
                  >
                    <Icon name="add" size={20} color={theme.colors.text} />
                  </TouchableOpacity>
                </View>
              )}
            />
            {errors.quantity && (
              <Text style={styles.errorText}>{errors.quantity.message}</Text>
            )}
          </View>

          {/* Reason Input */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reason *</Text>
            <Controller
              control={control}
              name="reason"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={[styles.textInput, styles.reasonInput]}
                  value={value}
                  onChangeText={onChange}
                  placeholder="Enter reason for stock adjustment..."
                  placeholderTextColor={theme.colors.textSecondary}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              )}
            />
            {errors.reason && (
              <Text style={styles.errorText}>{errors.reason.message}</Text>
            )}
          </View>
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!isValid || isSubmitting) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit(onSubmit)}
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? (
              <LoadingSpinner size="small" color={theme.colors.white} />
            ) : (
              <>
                <Icon name="check" size={20} color={theme.colors.white} />
                <Text style={styles.submitButtonText}>Adjust Stock</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
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
  scrollView: {
    flex: 1,
  },
  productInfo: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  productName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  productSku: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  stockInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currentStock: {
    fontSize: 16,
    color: theme.colors.text,
  },
  newStock: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  section: {
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  typeCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  typeCardSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  typeLabelSelected: {
    color: theme.colors.white,
  },
  typeDescription: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  typeDescriptionSelected: {
    color: theme.colors.white,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  quantityButton: {
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  quantityInput: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    paddingVertical: theme.spacing.md,
  },
  textInput: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 16,
    color: theme.colors.text,
  },
  reasonInput: {
    height: 100,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 12,
    marginTop: theme.spacing.xs,
  },
  footer: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  submitButtonDisabled: {
    backgroundColor: theme.colors.disabled,
  },
  submitButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default StockAdjustmentScreen;