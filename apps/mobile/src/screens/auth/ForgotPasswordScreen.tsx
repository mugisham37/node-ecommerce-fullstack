import React, {useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {Button, Text, TextInput, Card} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NavigationProps} from '@/navigation/AppNavigator';
import {theme} from '@/constants/theme';

export const ForgotPasswordScreen: React.FC<NavigationProps> = ({navigation}) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleResetPassword = async () => {
    setIsLoading(true);
    // TODO: Implement password reset logic
    setTimeout(() => {
      setIsLoading(false);
      // Navigate back or show success message
    }, 2000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>
            Reset Password
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Enter your email address and we'll send you a link to reset your password
          </Text>
        </View>

        <Card style={styles.card}>
          <Card.Content style={styles.cardContent}>
            <TextInput
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />

            <Button
              mode="contained"
              onPress={handleResetPassword}
              loading={isLoading}
              disabled={isLoading || !email}
              style={styles.resetButton}
              contentStyle={styles.buttonContent}>
              Send Reset Link
            </Button>

            <Button
              mode="text"
              onPress={() => navigation.goBack()}
              style={styles.backButton}>
              Back to Sign In
            </Button>
          </Card.Content>
        </Card>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 32,
  },
  title: {
    textAlign: 'center',
    marginBottom: 16,
    color: theme.colors.onBackground,
    fontWeight: 'bold',
  },
  subtitle: {
    textAlign: 'center',
    color: theme.colors.onSurfaceVariant,
    lineHeight: 24,
  },
  card: {
    flex: 1,
  },
  cardContent: {
    padding: 24,
  },
  input: {
    marginBottom: 24,
  },
  resetButton: {
    borderRadius: 8,
    marginBottom: 16,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  backButton: {
    alignSelf: 'center',
  },
});