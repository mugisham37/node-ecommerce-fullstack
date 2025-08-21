import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {DashboardScreen} from '@/screens/dashboard/DashboardScreen';
import {AnalyticsScreen} from '@/screens/dashboard/AnalyticsScreen';
import {ReportsScreen} from '@/screens/dashboard/ReportsScreen';
import {NotificationsScreen} from '@/screens/dashboard/NotificationsScreen';

export type DashboardStackParamList = {
  DashboardHome: undefined;
  Analytics: undefined;
  Reports: undefined;
  Notifications: undefined;
};

const DashboardStack = createNativeStackNavigator<DashboardStackParamList>();

export const DashboardNavigator: React.FC = () => {
  return (
    <DashboardStack.Navigator
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
      <DashboardStack.Screen
        name="DashboardHome"
        component={DashboardScreen}
        options={{title: 'Dashboard'}}
      />
      <DashboardStack.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{title: 'Analytics'}}
      />
      <DashboardStack.Screen
        name="Reports"
        component={ReportsScreen}
        options={{title: 'Reports'}}
      />
      <DashboardStack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{title: 'Notifications'}}
      />
    </DashboardStack.Navigator>
  );
};