import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {InventoryListScreen} from '@/screens/inventory/InventoryListScreen';
import {ProductDetailScreen} from '@/screens/inventory/ProductDetailScreen';
import {AddProductScreen} from '@/screens/inventory/AddProductScreen';
import {EditProductScreen} from '@/screens/inventory/EditProductScreen';
import {StockAdjustmentScreen} from '@/screens/inventory/StockAdjustmentScreen';
import {LowStockScreen} from '@/screens/inventory/LowStockScreen';
import {CategoriesScreen} from '@/screens/inventory/CategoriesScreen';

export type InventoryStackParamList = {
  InventoryList: undefined;
  ProductDetail: {productId: string};
  AddProduct: undefined;
  EditProduct: {productId: string};
  StockAdjustment: {productId: string};
  LowStock: undefined;
  Categories: undefined;
};

const InventoryStack = createNativeStackNavigator<InventoryStackParamList>();

export const InventoryNavigator: React.FC = () => {
  return (
    <InventoryStack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#fff',
        },
        headerTintColor: '#000',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}>
      <InventoryStack.Screen
        name="InventoryList"
        component={InventoryListScreen}
        options={{title: 'Inventory'}}
      />
      <InventoryStack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={{title: 'Product Details'}}
      />
      <InventoryStack.Screen
        name="AddProduct"
        component={AddProductScreen}
        options={{title: 'Add Product'}}
      />
      <InventoryStack.Screen
        name="EditProduct"
        component={EditProductScreen}
        options={{title: 'Edit Product'}}
      />
      <InventoryStack.Screen
        name="StockAdjustment"
        component={StockAdjustmentScreen}
        options={{title: 'Adjust Stock'}}
      />
      <InventoryStack.Screen
        name="LowStock"
        component={LowStockScreen}
        options={{title: 'Low Stock Items'}}
      />
      <InventoryStack.Screen
        name="Categories"
        component={CategoriesScreen}
        options={{title: 'Categories'}}
      />
    </InventoryStack.Navigator>
  );
};