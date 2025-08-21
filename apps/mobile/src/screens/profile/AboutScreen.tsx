import React from 'react';
import {View, StyleSheet, ScrollView} from 'react-native';
import {Text, Card} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import {theme} from '@/constants/theme';

export const AboutScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="headlineSmall" style={styles.title}>About</Text>
            <Text variant="bodyMedium" style={styles.description}>
              E-commerce Inventory Management App
            </Text>
            <Text variant="bodyMedium" style={styles.version}>
              Version 1.0.0
            </Text>
            <Text variant="bodyMedium" style={styles.description}>
              A comprehensive mobile solution for managing your e-commerce inventory, 
              tracking products, processing orders, and monitoring business performance.
            </Text>
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: theme.colors.background},
  scrollContent: {padding: 16},
  card: {marginBottom: 16},
  title: {marginBottom: 16, fontWeight: 'bold'},
  description: {marginBottom: 16, lineHeight: 24},
  version: {fontWeight: 'bold', marginBottom: 16, color: theme.colors.primary},
});