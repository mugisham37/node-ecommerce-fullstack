import React from 'react';
import {View, StyleSheet, ScrollView} from 'react-native';
import {Text, Card, FAB} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NavigationProps} from '@/navigation/AppNavigator';
import {theme} from '@/constants/theme';

export const OrdersListScreen: React.FC<NavigationProps> = ({navigation}) => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="headlineSmall" style={styles.title}>Orders</Text>
            <Text variant="bodyMedium">Order list will be displayed here.</Text>
          </Card.Content>
        </Card>
      </ScrollView>
      
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('CreateOrder')}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: theme.colors.background},
  scrollContent: {padding: 16},
  card: {marginBottom: 16},
  title: {marginBottom: 8, fontWeight: 'bold'},
  fab: {position: 'absolute', margin: 16, right: 0, bottom: 0},
});