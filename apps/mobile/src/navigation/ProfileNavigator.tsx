import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {ProfileScreen} from '@/screens/profile/ProfileScreen';
import {SettingsScreen} from '@/screens/profile/SettingsScreen';
import {EditProfileScreen} from '@/screens/profile/EditProfileScreen';
import {ChangePasswordScreen} from '@/screens/profile/ChangePasswordScreen';
import {AboutScreen} from '@/screens/profile/AboutScreen';
import {HelpScreen} from '@/screens/profile/HelpScreen';

export type ProfileStackParamList = {
  ProfileHome: undefined;
  Settings: undefined;
  EditProfile: undefined;
  ChangePassword: undefined;
  About: undefined;
  Help: undefined;
};

const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

export const ProfileNavigator: React.FC = () => {
  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#fff',
        },
        headerTintColor: '#000',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}>
      <ProfileStack.Screen
        name="ProfileHome"
        component={ProfileScreen}
        options={{title: 'Profile'}}
      />
      <ProfileStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{title: 'Settings'}}
      />
      <ProfileStack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{title: 'Edit Profile'}}
      />
      <ProfileStack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{title: 'Change Password'}}
      />
      <ProfileStack.Screen
        name="About"
        component={AboutScreen}
        options={{title: 'About'}}
      />
      <ProfileStack.Screen
        name="Help"
        component={HelpScreen}
        options={{title: 'Help & Support'}}
      />
    </ProfileStack.Navigator>
  );
};