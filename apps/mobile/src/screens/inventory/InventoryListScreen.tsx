import React, {useState} from 'react';
import {View, StyleSheet, FlatList} from 'react-native';
import {Text, Card, Searchbar, FAB, Chip} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NavigationProps} from '@/navigation/AppNavigator';
import {theme} from '@/constants/theme';

// Mock data
const mockProducts = [
  {
    id: '1',
    name: 'Wireless Headphones',
    sku: 'WH-001',
    stock: 45,
    price: 99.99,
    category: 'Electronics',
    lowStock: false,
  },
  {
    id: '2',
    name: 'Coffee Mug',
    sku: 'CM-002',
    stock: 5,
    price: 12.99,
    category: 'Kitchen',
    lowStock: true,
  },
  // Add more mock data as needed
];

export const InventoryListScreen: React.FC<NavigationProps> = ({navigation}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [products] = useState(mockProducts);

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderProduct = ({item}: {item: typeof mockProducts[0]}) => (
    <Card
      style={styles.productCard}
      onPress={() => navigation.navigate('ProductDetail', {productId: item.id})}>
      <Card.Content>
        <View style={styles.productHeader}>
          <Text variant="titleMedium" style={styles.productName}>
            {item.name}
          </Text>
          {item.lowStock && (
            <Chip mode="flat" style={styles.lowStockChip}>
              Low Stock
            </Chip>
          )}
        </View>
        
        <Text variant="bodyMedium" style={styles.productSku}>
          SKU: {item.sku}
        </Text>
        
        <View style={styles.productDetails}>
          <Text variant="bodyMedium">Stock: {item.stock}</Text>
          <Text variant="bodyMedium" style={styles.price}>
            ${item.price}
          </Text>
        </View>
        
        <Text variant="bodySmall" style={styles.category}>
          {item.category}
        </Text>
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Searchbar
          placeholder="Search products..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />

        <FlatList
          data={filteredProducts}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />

        <FAB
          icon="plus"
          style={styles.fab}
          onPress={() => navigation.navigate('AddProduct')}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  searchbar: {
    marginBottom: 16,
  },
  listContent: {
    paddingBottom: 80,
  },
  productCard: {
    marginBottom: 12,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  productName: {
    flex: 1,
    fontWeight: 'bold',
  },
  lowStockChip: {
    backgroundColor: theme.colors.errorContainer,
  },
  productSku: {
    color: theme.colors.onSurfaceVariant,
    marginBottom: 8,
  },
  productDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  price: {
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  category: {
    color: theme.colors.onSurfaceVariant,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});