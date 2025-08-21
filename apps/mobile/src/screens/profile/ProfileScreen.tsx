import React from 'react';
import {View, StyleSheet, ScrollView} from 'react-native';
import {Text, Card, Button, Avatar} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NavigationProps} from '@/navigation/AppNavigator';
import {useAuth} from '@/hooks/useAuth';
import {theme} from '@/constants/theme';

export const ProfileScreen: React.FC<NavigationProps> = ({navigation}) => {
  const {user, logout} = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.profileCard}>
          <Card.Content style={styles.profileContent}>
            <Avatar.Text 
              size={80} 
              label={user ? `${user.firstName[0]}${user.lastName[0]}` : 'U'} 
              style={styles.avatar}
            />
            <Text variant="headlineSmall" style={styles.name}>
              {user ? `${user.firstName} ${user.lastName}` : 'User'}
            </Text>
            <Text variant="bodyMedium" style={styles.email}>
              {user?.email || 'user@example.com'}
            </Text>
          </Card.Content>
        </Card>

        <View style={styles.menuContainer}>
          <Button
            mode="outlined"
            onPress={() => navigation.navigate('EditProfile')}
            style={styles.menuButton}
            contentStyle={styles.menuButtonContent}>
            Edit Profile
          </Button>
          
          <Button
            mode="outlined"
            onPress={() => navigation.navigate('Settings')}
            style={styles.menuButton}
            contentStyle={styles.menuButtonContent}>
            Settings
          </Button>
          
          <Button
            mode="outlined"
            onPress={() => navigation.navigate('Help')}
            style={styles.menuButton}
            contentStyle={styles.menuButtonContent}>
            Help & Support
          </Button>
          
          <Button
            mode="outlined"
            onPress={() => navigation.navigate('About')}
            style={styles.menuButton}
            contentStyle={styles.menuButtonContent}>
            About
          </Button>
          
          <Button
            mode="contained"
            onPress={logout}
            style={[styles.menuButton, styles.logoutButton]}
            contentStyle={styles.menuButtonContent}>
            Sign Out
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: theme.colors.background},
  scrollContent: {padding: 16},
  profileCard: {marginBottom: 24},
  profileContent: {alignItems: 'center', padding: 24},
  avatar: {marginBottom: 16},
  name: {fontWeight: 'bold', marginBottom: 8},
  email: {color: theme.colors.onSurfaceVariant},
  menuContainer: {gap: 12},
  menuButton: {borderRadius: 8},
  menuButtonContent: {paddingVertical: 8, justifyContent: 'flex-start'},
  logoutButton: {marginTop: 24, backgroundColor: theme.colors.error},
});