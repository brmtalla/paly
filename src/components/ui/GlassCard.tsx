import React from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../theme/ThemeContext';
import { SPACING, RADIUS, SHADOWS, GLASS } from '../../theme/spacing';

interface GlassCardProps {
  children: React.ReactNode;
  intensity?: number;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

export function GlassCard({
  children,
  intensity = GLASS.blur,
  padding = 'md',
  style,
}: GlassCardProps) {
  const { colors, colorScheme } = useTheme();

  const getPadding = () => {
    switch (padding) {
      case 'none':
        return 0;
      case 'sm':
        return SPACING.md;
      case 'md':
        return SPACING.lg;
      case 'lg':
        return SPACING.xl;
      default:
        return SPACING.lg;
    }
  };

  // On Android and web, BlurView doesn't work well, so we use a semi-transparent background
  if (Platform.OS === 'android' || Platform.OS === 'web') {
    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.glassBackground,
            borderColor: colors.glassBorder,
            padding: getPadding(),
          },
          SHADOWS.lg,
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <View style={[styles.container, SHADOWS.lg, style]}>
      <BlurView
        intensity={intensity}
        tint="light"
        style={[
          styles.blur,
          {
            borderColor: colors.glassBorder,
            padding: getPadding(),
          },
        ]}
      >
        {children}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
  },
  blur: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  card: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
});
