import React, {useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {Button, Text, TextInput, Card} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NavigationProps} from '@/navigation/AppNavigator';
import {theme} from '@/constants/theme';

interface ResetPasswordScreenProps extends NavigationProps {
  route: {
    params: {
      token: string;
    };
  };
}

export const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({
  navigation,
  route,
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {token} = route.params;

  const handleResetPassword = async () => {
    if (password !== confirmPassword) {
      // Show error
      return;
    }

    setIsLoading(true);
    // TODO: Implement password reset with token
    setTimeout(() => {
      setIsLoading(false);
      navigation.navigate('Login');
    }, 2000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>
            New Password
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Enter your new password
          </Text>
        </View>

        <Card style={styles.card}>
          <Card.Content style={styles.cardContent}>
            <TextInput
              label="New Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
              style={styles.input}
            />

            <TextInput
              label="Confirm New Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              style={styles.input}
            />

            <Button
              mode="contained"
              onPress={handleResetPassword}
              loading={isLoading}
              disabled={isLoading || !password || !confirmPassword}
              style={styles.resetButton}
              contentStyle={styles.buttonContent}>
              Reset Password
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
  },
  card: {
    flex: 1,
  },
  cardContent: {
    padding: 24,
  },
  input: {
    marginBottom: 16,
  },
  resetButton: {
    borderRadius: 8,
    marginTop: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
});