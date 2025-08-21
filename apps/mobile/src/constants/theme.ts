import {MD3LightTheme, MD3DarkTheme} from 'react-native-paper';

// Custom color palette
const colors = {
  primary: '#6366F1',
  primaryContainer: '#E0E7FF',
  secondary: '#10B981',
  secondaryContainer: '#D1FAE5',
  tertiary: '#F59E0B',
  tertiaryContainer: '#FEF3C7',
  surface: '#FFFFFF',
  surfaceVariant: '#F3F4F6',
  background: '#FAFAFA',
  error: '#EF4444',
  errorContainer: '#FEE2E2',
  onPrimary: '#FFFFFF',
  onPrimaryContainer: '#1E1B4B',
  onSecondary: '#FFFFFF',
  onSecondaryContainer: '#064E3B',
  onTertiary: '#FFFFFF',
  onTertiaryContainer: '#92400E',
  onSurface: '#111827',
  onSurfaceVariant: '#6B7280',
  onBackground: '#111827',
  onError: '#FFFFFF',
  onErrorContainer: '#7F1D1D',
  outline: '#D1D5DB',
  outlineVariant: '#E5E7EB',
  shadow: '#000000',
  scrim: '#000000',
  inverseSurface: '#1F2937',
  inverseOnSurface: '#F9FAFB',
  inversePrimary: '#A5B4FC',
  elevation: {
    level0: 'transparent',
    level1: '#FFFFFF',
    level2: '#F9FAFB',
    level3: '#F3F4F6',
    level4: '#E5E7EB',
    level5: '#D1D5DB',
  },
};

// Light theme
export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    ...colors,
  },
};

// Dark theme
export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#A5B4FC',
    primaryContainer: '#3730A3',
    secondary: '#6EE7B7',
    secondaryContainer: '#047857',
    tertiary: '#FCD34D',
    tertiaryContainer: '#B45309',
    surface: '#1F2937',
    surfaceVariant: '#374151',
    background: '#111827',
    error: '#F87171',
    errorContainer: '#7F1D1D',
    onPrimary: '#1E1B4B',
    onPrimaryContainer: '#E0E7FF',
    onSecondary: '#064E3B',
    onSecondaryContainer: '#D1FAE5',
    onTertiary: '#92400E',
    onTertiaryContainer: '#FEF3C7',
    onSurface: '#F9FAFB',
    onSurfaceVariant: '#D1D5DB',
    onBackground: '#F9FAFB',
    onError: '#7F1D1D',
    onErrorContainer: '#FEE2E2',
    outline: '#6B7280',
    outlineVariant: '#4B5563',
    shadow: '#000000',
    scrim: '#000000',
    inverseSurface: '#F9FAFB',
    inverseOnSurface: '#1F2937',
    inversePrimary: '#6366F1',
    elevation: {
      level0: 'transparent',
      level1: '#1F2937',
      level2: '#374151',
      level3: '#4B5563',
      level4: '#6B7280',
      level5: '#9CA3AF',
    },
  },
};

// Default theme (light)
export const theme = lightTheme;

// Typography
export const typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
};

// Spacing
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
};

// Border radius
export const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  full: 9999,
};

// Shadows
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8,
  },
};