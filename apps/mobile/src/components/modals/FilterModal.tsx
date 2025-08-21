import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { theme } from '../../constants/theme';
import type { InventoryFiltersDTO } from '@ecommerce/shared/types';

interface FilterModalProps {
  visible: boolean;
  filters: InventoryFiltersDTO;
  onApply: (filters: InventoryFiltersDTO) => void;
  onClear: () => void;
  onClose: () => void;
}

export const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  filters,
  onApply,
  onClear,
  onClose,
}) => {
  const [localFilters, setLocalFilters] = useState<InventoryFiltersDTO>(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleApply = () => {
    onApply(localFilters);
  };

  const handleClear = () => {
    setLocalFilters({});
    onClear();
  };

  const updateFilter = (key: keyof InventoryFiltersDTO, value: any) => {
    setLocalFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const hasActiveFilters = Object.keys(localFilters).some(key => 
    localFilters[key as keyof InventoryFiltersDTO] !== undefined &&
    localFilters[key as keyof InventoryFiltersDTO] !== null &&
    localFilters[key as keyof InventoryFiltersDTO] !== ''
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          
          <Text style={styles.title}>Filter Inventory</Text>
          
          <TouchableOpacity 
            onPress={handleClear} 
            style={styles.clearButton}
            disabled={!hasActiveFilters}
          >
            <Text style={[
              styles.clearButtonText,
              !hasActiveFilters && styles.clearButtonTextDisabled
            ]}>
              Clear
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Stock Status */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Stock Status</Text>
            
            <View style={styles.filterItem}>
              <View style={styles.filterItemContent}>
                <Icon name="warning" size={20} color={theme.colors.warning} />
                <View style={styles.filterItemText}>
                  <Text style={styles.filterItemTitle}>Low Stock Only</Text>
                  <Text style={styles.filterItemDescription}>
                    Show items at or below reorder level
                  </Text>
                </View>
              </View>
              <Switch
                value={localFilters.lowStock || false}
                onValueChange={(value) => updateFilter('lowStock', value)}
                trackColor={{ 
                  false: theme.colors.border, 
                  true: theme.colors.primary + '40' 
                }}
                thumbColor={localFilters.lowStock ? theme.colors.primary : theme.colors.textSecondary}
              />
            </View>
          </View>

          {/* Categories */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Categories</Text>
            
            {/* Mock categories - in real app, these would come from API */}
            {[
              { id: 'cat-1', name: 'Electronics', icon: 'devices' },
              { id: 'cat-2', name: 'Kitchen', icon: 'kitchen' },
              { id: 'cat-3', name: 'Clothing', icon: 'checkroom' },
              { id: 'cat-4', name: 'Books', icon: 'menu-book' },
            ].map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.filterItem,
                  localFilters.categoryId === category.id && styles.filterItemSelected
                ]}
                onPress={() => {
                  const newValue = localFilters.categoryId === category.id ? undefined : category.id;
                  updateFilter('categoryId', newValue);
                }}
              >
                <View style={styles.filterItemContent}>
                  <Icon 
                    name={category.icon} 
                    size={20} 
                    color={localFilters.categoryId === category.id ? theme.colors.primary : theme.colors.textSecondary} 
                  />
                  <Text style={[
                    styles.filterItemTitle,
                    localFilters.categoryId === category.id && styles.filterItemTitleSelected
                  ]}>
                    {category.name}
                  </Text>
                </View>
                {localFilters.categoryId === category.id && (
                  <Icon name="check" size={20} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Suppliers */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Suppliers</Text>
            
            {/* Mock suppliers - in real app, these would come from API */}
            {[
              { id: 'sup-1', name: 'TechCorp Supplies' },
              { id: 'sup-2', name: 'Kitchen Supplies Co' },
              { id: 'sup-3', name: 'Fashion Forward' },
              { id: 'sup-4', name: 'Book Distributors Inc' },
            ].map((supplier) => (
              <TouchableOpacity
                key={supplier.id}
                style={[
                  styles.filterItem,
                  localFilters.supplierId === supplier.id && styles.filterItemSelected
                ]}
                onPress={() => {
                  const newValue = localFilters.supplierId === supplier.id ? undefined : supplier.id;
                  updateFilter('supplierId', newValue);
                }}
              >
                <View style={styles.filterItemContent}>
                  <Icon 
                    name="business" 
                    size={20} 
                    color={localFilters.supplierId === supplier.id ? theme.colors.primary : theme.colors.textSecondary} 
                  />
                  <Text style={[
                    styles.filterItemTitle,
                    localFilters.supplierId === supplier.id && styles.filterItemTitleSelected
                  ]}>
                    {supplier.name}
                  </Text>
                </View>
                {localFilters.supplierId === supplier.id && (
                  <Icon name="check" size={20} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.applyButton}
            onPress={handleApply}
          >
            <Text style={styles.applyButtonText}>
              Apply Filters {hasActiveFilters ? `(${Object.keys(localFilters).length})` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  closeButton: {
    padding: theme.spacing.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  clearButton: {
    padding: theme.spacing.sm,
  },
  clearButtonText: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  clearButtonTextDisabled: {
    color: theme.colors.textSecondary,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  filterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.xs,
  },
  filterItemSelected: {
    backgroundColor: theme.colors.primaryContainer,
  },
  filterItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  filterItemText: {
    marginLeft: theme.spacing.sm,
    flex: 1,
  },
  filterItemTitle: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
  },
  filterItemTitleSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  filterItemDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  footer: {
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  applyButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  applyButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});