import React from 'react';
import {View, StyleSheet, ScrollView} from 'react-native';
import {Text, Card, Button} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NavigationProps} from '@/navigation/AppNavigator';
import {theme} from '@/constants/theme';

interface ProductDetailScreenProps extends NavigationProps {
  route: {
    params: {
      productId: string;
    };
  };
}

export const ProductDetailScreen: React.FC<ProductDetailScreenProps> = ({
  navigation,
  route,
}) => {
  const {productId} = route.params;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="headlineSmall" style={styles.title}>
              Product Details
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Product ID: {productId}
            </Text>
            <Text variant="bodyMedium" style={styles.description}>
              Detailed product information will be displayed here.
            </Text>
          </Card.Content>
        </Card>

        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('EditProduct', {productId})}
            style={styles.button}>
            Edit Product
          </Button>
          
          <Button
            mode="outlined"
            onPress={() => navigation.navigate('StockAdjustment', {productId})}
            style={styles.button}>
            Adjust Stock
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    marginBottom: 24,
  },
  title: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  subtitle: {
    color: theme.colors.onSurfaceVariant,
    marginBottom: 16,
  },
  description: {
    color: theme.colors.onSurfaceVariant,
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    borderRadius: 8,
  },
});