import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {OrdersListScreen} from '@/screens/orders/OrdersListScreen';
import {OrderDetailScreen} from '@/screens/orders/OrderDetailScreen';
import {CreateOrderScreen} from '@/screens/orders/CreateOrderScreen';
import {EditOrderScreen} from '@/screens/orders/EditOrderScreen';
import {OrderHistoryScreen} from '@/screens/orders/OrderHistoryScreen';

export type OrdersStackParamList = {
  OrdersList: undefined;
  OrderDetail: {orderId: string};
  CreateOrder: undefined;
  EditOrder: {orderId: string};
  OrderHistory: undefined;
};

const OrdersStack = createNativeStackNavigator<OrdersStackParamList>();

export const OrdersNavigator: React.FC = () => {
  return (
    <OrdersStack.Navigator
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
      <OrdersStack.Screen
        name="OrdersList"
        component={OrdersListScreen}
        options={{title: 'Orders'}}
      />
      <OrdersStack.Screen
        name="OrderDetail"
        component={OrderDetailScreen}
        options={{title: 'Order Details'}}
      />
      <OrdersStack.Screen
        name="CreateOrder"
        component={CreateOrderScreen}
        options={{title: 'Create Order'}}
      />
      <OrdersStack.Screen
        name="EditOrder"
        component={EditOrderScreen}
        options={{title: 'Edit Order'}}
      />
      <OrdersStack.Screen
        name="OrderHistory"
        component={OrderHistoryScreen}
        options={{title: 'Order History'}}
      />
    </OrdersStack.Navigator>
  );
};