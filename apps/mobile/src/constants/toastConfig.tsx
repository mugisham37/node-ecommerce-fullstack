import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {BaseToast, ErrorToast, InfoToast} from 'react-native-toast-message';
import {theme} from './theme';

export const toastConfig = {
  success: (props: any) => (
    <BaseToast
      {...props}
      style={[styles.baseToast, styles.successToast]}
      contentContainerStyle={styles.contentContainer}
      text1Style={styles.text1}
      text2Style={styles.text2}
      text2NumberOfLines={2}
    />
  ),
  error: (props: any) => (
    <ErrorToast
      {...props}
      style={[styles.baseToast, styles.errorToast]}
      contentContainerStyle={styles.contentContainer}
      text1Style={styles.text1}
      text2Style={styles.text2}
      text2NumberOfLines={2}
    />
  ),
  info: (props: any) => (
    <InfoToast
      {...props}
      style={[styles.baseToast, styles.infoToast]}
      contentContainerStyle={styles.contentContainer}
      text1Style={styles.text1}
      text2Style={styles.text2}
      text2NumberOfLines={2}
    />
  ),
  warning: (props: any) => (
    <BaseToast
      {...props}
      style={[styles.baseToast, styles.warningToast]}
      contentContainerStyle={styles.contentContainer}
      text1Style={styles.text1}
      text2Style={styles.text2}
      text2NumberOfLines={2}
    />
  ),
};

const styles = StyleSheet.create({
  baseToast: {
    borderLeftWidth: 5,
    width: '90%',
    height: 70,
    borderRadius: 8,
    marginTop: 10,
  },
  successToast: {
    borderLeftColor: theme.colors.secondary,
    backgroundColor: theme.colors.secondaryContainer,
  },
  errorToast: {
    borderLeftColor: theme.colors.error,
    backgroundColor: theme.colors.errorContainer,
  },
  infoToast: {
    borderLeftColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryContainer,
  },
  warningToast: {
    borderLeftColor: theme.colors.tertiary,
    backgroundColor: theme.colors.tertiaryContainer,
  },
  contentContainer: {
    paddingHorizontal: 15,
  },
  text1: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  text2: {
    fontSize: 14,
    fontWeight: '400',
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
});