import React from 'react';
import {View, StyleSheet, ScrollView} from 'react-native';
import {Text, Card, Button} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NavigationProps} from '@/navigation/AppNavigator';
import {theme} from '@/constants/theme';

export const DashboardScreen: React.FC<NavigationProps> = ({navigation}) => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>
            Dashboard
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Welcome back! Here's your inventory overview
          </Text>
        </View>

        <View style={styles.statsContainer}>
          <Card style={styles.statCard}>
            <Card.Content>
              <Text variant="titleMedium">Total Products</Text>
              <Text variant="headlineLarge" style={styles.statNumber}>
                1,234
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.statCard}>
            <Card.Content>
              <Text variant="titleMedium">Low Stock Items</Text>
              <Text variant="headlineLarge" style={[styles.statNumber, styles.warningText]}>
                23
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.statCard}>
            <Card.Content>
              <Text variant="titleMedium">Pending Orders</Text>
              <Text variant="headlineLarge" style={styles.statNumber}>
                45
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.statCard}>
            <Card.Content>
              <Text variant="titleMedium">Today's Revenue</Text>
              <Text variant="headlineLarge" style={[styles.statNumber, styles.successText]}>
                $2,456
              </Text>
            </Card.Content>
          </Card>
        </View>

        <View style={styles.actionsContainer}>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('Analytics')}
            style={styles.actionButton}>
            View Analytics
          </Button>
          
          <Button
            mode="outlined"
            onPress={() => navigation.navigate('Reports')}
            style={styles.actionButton}>
            Generate Reports
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
  header: {
    marginBottom: 24,
  },
  title: {
    color: theme.colors.onBackground,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    color: theme.colors.onSurfaceVariant,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
  },
  statNumber: {
    fontWeight: 'bold',
    marginTop: 8,
  },
  warningText: {
    color: theme.colors.error,
  },
  successText: {
    color: '#4CAF50',
  },
  actionsContainer: {
    gap: 12,
  },
  actionButton: {
    borderRadius: 8,
  },
});