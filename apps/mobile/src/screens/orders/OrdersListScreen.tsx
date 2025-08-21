import React, {useState, useCallback} from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Text,
  FAB,
  Searchbar,
  IconButton,
  Menu,
  Divider,
  Chip,
} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NavigationProps} from '@/navigation/AppNavigator';
import {theme} from '@/constants/theme';
import {useOrders} from '@/hooks/useOrders';
import {OrderCard} from '@/components/orders';
import {LoadingSpinner, EmptyState} from '@/components/common';
import {FilterModal} from '@/components/modals';
import {Order, OrderStatus} from '@ecommerce/shared/types';
import {OrderFiltersDTO} from '@ecommerce/validation';

export const OrdersListScreen: React.FC<NavigationProps> = ({navigation}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [sortMenuVisible, setSortMenuVisible] = useState(false);

  const {
    orders,
    isLoading,
    isRefreshing,
    error,
    hasNextPage,
    totalCount,
    updateOrderStatus,
    refreshOrders,
    loadMore,
    setFilters,
    setSearchOptions,
    clearFilters,
  } = useOrders({
    searchOptions: {
      page: 1,
      limit: 20,
      query: searchQuery,
    },
  });

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setSearchOptions({
      page: 1,
      limit: 20,
      query: query.trim() || undefined,
    });
  }, [setSearchOptions]);

  const handleOrderPress = useCallback((order: Order) => {
    navigation.navigate('OrderDetail', {orderId: order.id});
  }, [navigation]);

  const handleStatusUpdate = useCallback(async (orderId: string, status: OrderStatus) => {
    try {
      await updateOrderStatus(orderId, {
        status,
        notifyCustomer: true,
      });
    } catch (error) {
      console.error('Failed to update order status:', error);
    }
  }, [updateOrderStatus]);

  const handleApplyFilters = useCallback((filters: OrderFiltersDTO) => {
    setFilters(filters);
    setShowFilterModal(false);
  }, [setFilters]);

  const handleClearFilters = useCallback(() => {
    clearFilters();
    setSearchQuery('');
    setShowFilterModal(false);
  }, [clearFilters]);

  const handleSort = useCallback((field: string, direction: 'asc' | 'desc') => {
    setSearchOptions(prev => ({
      ...prev,
      sort: {field, direction},
      page: 1,
    }));
    setSortMenuVisible(false);
  }, [setSearchOptions]);

  const renderOrderItem = useCallback(({item}: {item: Order}) => (
    <OrderCard
      order={item}
      onPress={handleOrderPress}
      onStatusUpdate={handleStatusUpdate}
      showActions={true}
    />
  ), [handleOrderPress, handleStatusUpdate]);

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search orders..."
          onChangeText={handleSearch}
          value={searchQuery}
          style={styles.searchbar}
          inputStyle={styles.searchInput}
        />
        <View style={styles.headerActions}>
          <Menu
            visible={sortMenuVisible}
            onDismiss={() => setSortMenuVisible(false)}
            anchor={
              <IconButton
                icon="sort"
                size={24}
                onPress={() => setSortMenuVisible(true)}
              />
            }
          >
            <Menu.Item
              onPress={() => handleSort('createdAt', 'desc')}
              title="Newest First"
            />
            <Menu.Item
              onPress={() => handleSort('createdAt', 'asc')}
              title="Oldest First"
            />
            <Menu.Item
              onPress={() => handleSort('totalAmount', 'desc')}
              title="Highest Amount"
            />
            <Menu.Item
              onPress={() => handleSort('totalAmount', 'asc')}
              title="Lowest Amount"
            />
            <Divider />
            <Menu.Item
              onPress={() => handleSort('status', 'asc')}
              title="By Status"
            />
          </Menu>

          <IconButton
            icon="filter-variant"
            size={24}
            onPress={() => setShowFilterModal(true)}
          />
        </View>
      </View>

      <View style={styles.statsContainer}>
        <Chip icon="package-variant" style={styles.statsChip}>
          {totalCount} Orders
        </Chip>
      </View>
    </View>
  );

  const renderFooter = () => {
    if (!hasNextPage) return null;
    return (
      <View style={styles.footer}>
        <LoadingSpinner size="small" />
      </View>
    );
  };

  const renderEmpty = () => (
    <EmptyState
      icon="package-variant-closed"
      title="No Orders Found"
      description={
        searchQuery
          ? "No orders match your search criteria"
          : "No orders have been created yet"
      }
      actionLabel={searchQuery ? "Clear Search" : "Create Order"}
      onAction={
        searchQuery
          ? () => handleSearch('')
          : () => navigation.navigate('CreateOrder')
      }
    />
  );

  if (isLoading && orders.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState
          icon="alert-circle"
          title="Error Loading Orders"
          description={error.message}
          actionLabel="Retry"
          onAction={refreshOrders}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={orders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshOrders}
            colors={[theme.colors.primary]}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.1}
        showsVerticalScrollIndicator={false}
      />

      <FilterModal
        visible={showFilterModal}
        onDismiss={() => setShowFilterModal(false)}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
        filterType="orders"
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('CreateOrder')}
        label="New Order"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  listContent: {
    flexGrow: 1,
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  searchbar: {
    flex: 1,
    marginRight: 8,
  },
  searchInput: {
    fontSize: 16,
  },
  headerActions: {
    flexDirection: 'row',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statsChip: {
    backgroundColor: theme.colors.primaryContainer,
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});