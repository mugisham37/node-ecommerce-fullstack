import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LoginForm } from '../../components/forms/LoginForm';
import { useAuth } from '../../hooks/useAuth';
import { BiometricService } from '../../services/BiometricService';

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation();
  const { login, isLoading } = useAuth();
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  React.useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    const available = await BiometricService.isBiometricAvailable();
    setBiometricAvailable(available);
  };

  const handleLogin = async (credentials: { email: string; password: string }) => {
    try {
      await login(credentials);
      navigation.navigate('Dashboard' as never);
    } catch (error) {
      Alert.alert('Login Failed', 'Invalid credentials. Please try again.');
    }
  };

  const handleBiometricLogin = async () => {
    try {
      const success = await BiometricService.authenticate();
      if (success) {
        // Retrieve stored credentials and login
        const credentials = await BiometricService.getStoredCredentials();
        if (credentials) {
          await login(credentials);
          navigation.navigate('Dashboard' as never);
        }
      }
    } catch (error) {
      Alert.alert('Biometric Authentication Failed', 'Please try again or use password.');
    }
  };

  const navigateToRegister = () => {
    navigation.navigate('Register' as never);
  };

  const navigateToForgotPassword = () => {
    navigation.navigate('ForgotPassword' as never);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to your account</Text>
          </View>

          <LoginForm
            onSubmit={handleLogin}
            isLoading={isLoading}
            biometricAvailable={biometricAvailable}
            onBiometricLogin={handleBiometricLogin}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Don't have an account?{' '}
              <Text style={styles.link} onPress={navigateToRegister}>
                Sign up
              </Text>
            </Text>
            <Text style={styles.link} onPress={navigateToForgotPassword}>
              Forgot Password?
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  footer: {
    alignItems: 'center',
    marginTop: 30,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  link: {
    color: '#007bff',
    fontWeight: '600',
  },
});