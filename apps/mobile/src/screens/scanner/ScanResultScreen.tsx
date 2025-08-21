import React from 'react';
import {View, StyleSheet, ScrollView} from 'react-native';
import {Text, Card, Button} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NavigationProps} from '@/navigation/AppNavigator';
import {theme} from '@/constants/theme';

interface ScanResultScreenProps extends NavigationProps {
  route: {
    params: {
      barcode: string;
      productId?: string;
    };
  };
}

export const ScanResultScreen: React.FC<ScanResultScreenProps> = ({navigation, route}) => {
  const {barcode, productId} = route.params;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="headlineSmall" style={styles.title}>Scan Result</Text>
            <Text variant="bodyMedium">Barcode: {barcode}</Text>
            {productId && <Text variant="bodyMedium">Product ID: {productId}</Text>}
            <Text variant="bodyMedium" style={styles.description}>
              Product information and actions will be displayed here.
            </Text>
          </Card.Content>
        </Card>

        <View style={styles.buttonContainer}>
          <Button mode="contained" style={styles.button}>
            View Product Details
          </Button>
          <Button mode="outlined" style={styles.button}>
            Adjust Stock
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: theme.colors.background},
  scrollContent: {padding: 16},
  card: {marginBottom: 24},
  title: {marginBottom: 16, fontWeight: 'bold'},
  description: {marginTop: 16, color: theme.colors.onSurfaceVariant},
  buttonContainer: {gap: 12},
  button: {borderRadius: 8},
});