import { Platform } from 'react-native';

// Spacing scale - generous and consistent
// Based on 4px base unit for mathematical harmony

export const SPACING = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
  '4xl': 64,
  '5xl': 96,
} as const;

// Border radius scale
export const RADIUS = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  full: 9999,
} as const;

// Helper to create cross-platform shadow styles
const createShadow = (offsetY: number, blur: number, opacity: number, elevation: number) => {
  if (Platform.OS === 'web') {
    return {
      boxShadow: `0 ${offsetY}px ${blur}px rgba(0, 0, 0, ${opacity})`,
    };
  }
  return {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: offsetY },
    shadowOpacity: opacity,
    shadowRadius: blur,
    elevation,
  };
};

// Shadow styles for elevation
export const SHADOWS = {
  none:
    Platform.OS === 'web'
      ? { boxShadow: 'none' }
      : {
          shadowColor: 'transparent',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0,
          shadowRadius: 0,
          elevation: 0,
        },
  sm: createShadow(1, 2, 0.04, 1),
  md: createShadow(2, 4, 0.06, 2),
  lg: createShadow(4, 8, 0.08, 4),
  xl: createShadow(8, 16, 0.1, 8),
} as const;

// Glass morphism styles
export const GLASS = {
  blur: 20,
  backgroundOpacity: 0.72,
  borderOpacity: 0.18,
} as const;

// Animation durations (in ms)
export const ANIMATION = {
  instant: 0,
  fast: 150,
  normal: 250,
  slow: 400,
  gentle: 600,
} as const;

// Common layout constants
export const LAYOUT = {
  screenPadding: SPACING.lg,
  cardPadding: SPACING.lg,
  sectionGap: SPACING.xl,
  itemGap: SPACING.md,
  inputHeight: 48,
  buttonHeight: 52,
  headerHeight: 56,
  tabBarHeight: 80,
  tabBarContentInset: 120,
  maxContentWidth: 600,
  maxAppWidth: 720,
  tabBarMaxWidth: 688,
  minTouchTarget: 44,
} as const;
