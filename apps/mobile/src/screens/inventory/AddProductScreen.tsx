import React from 'react';
import {View, StyleSheet, ScrollView} from 'react-native';
import {Text, Card, TextInput, Button} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import {theme} from '@/constants/theme';

export const AddProductScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="headlineSmall" style={styles.title}>
              Add New Product
            </Text>
            
            <TextInput
              label="Product Name"
              style={styles.input}
            />
            
            <TextInput
              label="SKU"
              style={styles.input}
            />
            
            <TextInput
              label="Price"
              keyboardType="numeric"
              style={styles.input}
            />
            
            <TextInput
              label="Initial Stock"
              keyboardType="numeric"
              style={styles.input}
            />
            
            <Button
              mode="contained"
              style={styles.button}>
              Add Product
            </Button>
          </Card.Content>
        </Card>
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
    marginBottom: 16,
  },
  title: {
    marginBottom: 24,
    fontWeight: 'bold',
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 16,
    borderRadius: 8,
  },
});