import React from 'react';
import { View, StyleSheet, ViewStyle, Pressable, Platform } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { SPACING, RADIUS, SHADOWS } from '../../theme/spacing';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'glass' | 'solid';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  onPress?: () => void;
  style?: ViewStyle;
}

export function Card({ children, variant = 'default', padding = 'md', onPress, style }: CardProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    // Skip animated transforms on web to avoid CSS issues
    if (Platform.OS === 'web') {
      return {};
    }
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = () => {
    if (onPress && Platform.OS !== 'web') {
      scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
    }
  };

  const handlePressOut = () => {
    if (onPress && Platform.OS !== 'web') {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    }
  };

  const getBackgroundColor = () => {
    switch (variant) {
      case 'default':
        return colors.card;
      case 'elevated':
        return colors.card;
      case 'glass':
        return colors.glassBackground;
      case 'solid':
        return colors.backgroundSecondary;
      default:
        return colors.card;
    }
  };

  const getBorderColor = () => {
    switch (variant) {
      case 'glass':
        return colors.glassBorder;
      case 'solid':
        return colors.border;
      default:
        return 'transparent';
    }
  };

  const getShadow = () => {
    switch (variant) {
      case 'elevated':
        return SHADOWS.lg;
      case 'glass':
        return SHADOWS.md;
      case 'solid':
        return SHADOWS.none;
      default:
        return SHADOWS.md; // All cards get shadows by default now!
    }
  };

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
      case 'xl':
        return SPACING['2xl'];
      default:
        return SPACING.lg;
    }
  };

  const cardStyle: ViewStyle = {
    backgroundColor: getBackgroundColor(),
    borderColor: getBorderColor(),
    padding: getPadding(),
    ...getShadow(),
  };

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.card, cardStyle, animatedStyle, style]}
      >
        {children}
      </AnimatedPressable>
    );
  }

  return <View style={[styles.card, cardStyle, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
});
