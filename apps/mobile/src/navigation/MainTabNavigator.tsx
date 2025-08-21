import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {DashboardNavigator} from './DashboardNavigator';
import {InventoryNavigator} from './InventoryNavigator';
import {OrdersNavigator} from './OrdersNavigator';
import {ScannerNavigator} from './ScannerNavigator';
import {ProfileNavigator} from './ProfileNavigator';
import {theme} from '@/constants/theme';

export type MainTabParamList = {
  Dashboard: undefined;
  Inventory: undefined;
  Scanner: undefined;
  Orders: undefined;
  Profile: undefined;
};

const MainTab = createBottomTabNavigator<MainTabParamList>();

export const MainTabNavigator: React.FC = () => {
  return (
    <MainTab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarIcon: ({focused, color, size}) => {
          let iconName: string;

          switch (route.name) {
            case 'Dashboard':
              iconName = 'dashboard';
              break;
            case 'Inventory':
              iconName = 'inventory';
              break;
            case 'Scanner':
              iconName = 'qr-code-scanner';
              break;
            case 'Orders':
              iconName = 'shopping-cart';
              break;
            case 'Profile':
              iconName = 'person';
              break;
            default:
              iconName = 'help';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outline,
          borderTopWidth: 1,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      })}>
      <MainTab.Screen
        name="Dashboard"
        component={DashboardNavigator}
        options={{
          tabBarLabel: 'Dashboard',
        }}
      />
      <MainTab.Screen
        name="Inventory"
        component={InventoryNavigator}
        options={{
          tabBarLabel: 'Inventory',
        }}
      />
      <MainTab.Screen
        name="Scanner"
        component={ScannerNavigator}
        options={{
          tabBarLabel: 'Scanner',
        }}
      />
      <MainTab.Screen
        name="Orders"
        component={OrdersNavigator}
        options={{
          tabBarLabel: 'Orders',
        }}
      />
      <MainTab.Screen
        name="Profile"
        component={ProfileNavigator}
        options={{
          tabBarLabel: 'Profile',
        }}
      />
    </MainTab.Navigator>
  );
};