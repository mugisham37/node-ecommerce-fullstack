import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {
  Portal,
  Modal,
  Text,
  Button,
  IconButton,
  Switch,
  List,
  Chip,
  Divider,
} from 'react-native-paper';
import { theme } from '../../constants/theme';
import { OrderStatus } from '@ecommerce/shared/types';
import type { InventoryFiltersDTO, OrderFiltersDTO } from '@ecommerce/validation';

interface FilterModalProps {
  visible: boolean;
  onDismiss: () => void;
  onApply: (filters: any) => void;
  onClear: () => void;
  filterType: 'inventory' | 'orders';
  initialFilters?: any;
}

export const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onDismiss,
  onApply,
  onClear,
  filterType,
  initialFilters = {},
}) => {
  const [localFilters, setLocalFilters] = useState<any>(initialFilters);

  useEffect(() => {
    setLocalFilters(initialFilters);
  }, [initialFilters]);

  const handleApply = () => {
    onApply(localFilters);
  };

  const handleClear = () => {
    setLocalFilters({});
    onClear();
  };

  const updateFilter = (key: string, value: any) => {
    setLocalFilters((prev: any) => ({
      ...prev,
      [key]: value,
    }));
  };

  const hasActiveFilters = Object.keys(localFilters).some(key => 
    localFilters[key] !== undefined &&
    localFilters[key] !== null &&
    localFilters[key] !== ''
  );

  const renderInventoryFilters = () => (
    <>
      {/* Stock Status */}
      <Text variant="titleMedium" style={styles.sectionTitle}>Stock Status</Text>
      
      <List.Item
        title="Low Stock Only"
        description="Show items at or below reorder level"
        left={(props) => <List.Icon {...props} icon="alert" />}
        right={() => (
          <Switch
            value={localFilters.lowStock || false}
            onValueChange={(value) => updateFilter('lowStock', value)}
          />
        )}
      />

      <Divider style={styles.divider} />

      {/* Categories */}
      <Text variant="titleMedium" style={styles.sectionTitle}>Categories</Text>
      
      {[
        { id: 'cat-1', name: 'Electronics', icon: 'devices' },
        { id: 'cat-2', name: 'Kitchen', icon: 'silverware-fork-knife' },
        { id: 'cat-3', name: 'Clothing', icon: 'tshirt-crew' },
        { id: 'cat-4', name: 'Books', icon: 'book' },
      ].map((category) => (
        <List.Item
          key={category.id}
          title={category.name}
          left={(props) => <List.Icon {...props} icon={category.icon} />}
          right={() => 
            localFilters.categoryId === category.id ? (
              <List.Icon icon="check" color={theme.colors.primary} />
            ) : null
          }
          onPress={() => {
            const newValue = localFilters.categoryId === category.id ? undefined : category.id;
            updateFilter('categoryId', newValue);
          }}
          style={localFilters.categoryId === category.id ? styles.selectedItem : undefined}
        />
      ))}
    </>
  );

  const renderOrderFilters = () => (
    <>
      {/* Order Status */}
      <Text variant="titleMedium" style={styles.sectionTitle}>Order Status</Text>
      
      <View style={styles.chipContainer}>
        {Object.values(OrderStatus).map((status) => (
          <Chip
            key={status}
            selected={localFilters.status === status}
            onPress={() => {
              const newValue = localFilters.status === status ? undefined : status;
              updateFilter('status', newValue);
            }}
            style={styles.chip}
          >
            {status}
          </Chip>
        ))}
      </View>

      <Divider style={styles.divider} />

      {/* Date Range */}
      <Text variant="titleMedium" style={styles.sectionTitle}>Date Range</Text>
      
      <List.Item
        title="Today"
        left={(props) => <List.Icon {...props} icon="calendar-today" />}
        onPress={() => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          updateFilter('dateFrom', today);
          updateFilter('dateTo', new Date());
        }}
      />
      
      <List.Item
        title="This Week"
        left={(props) => <List.Icon {...props} icon="calendar-week" />}
        onPress={() => {
          const today = new Date();
          const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
          weekStart.setHours(0, 0, 0, 0);
          updateFilter('dateFrom', weekStart);
          updateFilter('dateTo', new Date());
        }}
      />
      
      <List.Item
        title="This Month"
        left={(props) => <List.Icon {...props} icon="calendar-month" />}
        onPress={() => {
          const today = new Date();
          const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
          updateFilter('dateFrom', monthStart);
          updateFilter('dateTo', new Date());
        }}
      />

      <Divider style={styles.divider} />

      {/* Amount Range */}
      <Text variant="titleMedium" style={styles.sectionTitle}>Amount Range</Text>
      
      <List.Item
        title="Under $100"
        left={(props) => <List.Icon {...props} icon="currency-usd" />}
        onPress={() => {
          updateFilter('maxAmount', 100);
          updateFilter('minAmount', undefined);
        }}
      />
      
      <List.Item
        title="$100 - $500"
        left={(props) => <List.Icon {...props} icon="currency-usd" />}
        onPress={() => {
          updateFilter('minAmount', 100);
          updateFilter('maxAmount', 500);
        }}
      />
      
      <List.Item
        title="Over $500"
        left={(props) => <List.Icon {...props} icon="currency-usd" />}
        onPress={() => {
          updateFilter('minAmount', 500);
          updateFilter('maxAmount', undefined);
        }}
      />
    </>
  );

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContent}
      >
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.title}>
            Filter {filterType === 'orders' ? 'Orders' : 'Inventory'}
          </Text>
          <IconButton
            icon="close"
            size={24}
            onPress={onDismiss}
          />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {filterType === 'orders' ? renderOrderFilters() : renderInventoryFilters()}
        </ScrollView>

        <View style={styles.footer}>
          <Button
            mode="outlined"
            onPress={handleClear}
            style={styles.footerButton}
            disabled={!hasActiveFilters}
          >
            Clear All
          </Button>
          <Button
            mode="contained"
            onPress={handleApply}
            style={styles.footerButton}
          >
            Apply {hasActiveFilters ? `(${Object.keys(localFilters).length})` : ''}
          </Button>
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContent: {
    backgroundColor: theme.colors.surface,
    margin: 20,
    borderRadius: 8,
    maxHeight: '80%',
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
  },
  title: {
    fontWeight: 'bold',
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 16,
    color: theme.colors.primary,
  },
  selectedItem: {
    backgroundColor: theme.colors.primaryContainer,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    marginBottom: 4,
  },
  divider: {
    marginVertical: 16,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outline,
  },
  footerButton: {
    flex: 1,
  },
});