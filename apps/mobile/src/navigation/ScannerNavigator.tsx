import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {ScannerScreen} from '@/screens/scanner/ScannerScreen';
import {ScanResultScreen} from '@/screens/scanner/ScanResultScreen';
import {ManualEntryScreen} from '@/screens/scanner/ManualEntryScreen';

export type ScannerStackParamList = {
  ScannerHome: undefined;
  ScanResult: {
    barcode: string;
    productId?: string;
  };
  ManualEntry: undefined;
};

const ScannerStack = createNativeStackNavigator<ScannerStackParamList>();

export const ScannerNavigator: React.FC = () => {
  return (
    <ScannerStack.Navigator
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
      <ScannerStack.Screen
        name="ScannerHome"
        component={ScannerScreen}
        options={{title: 'Barcode Scanner'}}
      />
      <ScannerStack.Screen
        name="ScanResult"
        component={ScanResultScreen}
        options={{title: 'Scan Result'}}
      />
      <ScannerStack.Screen
        name="ManualEntry"
        component={ManualEntryScreen}
        options={{title: 'Manual Entry'}}
      />
    </ScannerStack.Navigator>
  );
};