import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';
import { SPACING, RADIUS, LAYOUT, SHADOWS } from '../../theme/spacing';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface ButtonProps {
  children: React.ReactNode;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
}: ButtonProps) {
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
    if (Platform.OS !== 'web') {
      scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
    }
  };

  const handlePressOut = () => {
    if (Platform.OS !== 'web') {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    }
  };

  // Accent-first design: primary buttons are white/card colored
  const getBackgroundColor = () => {
    if (disabled) return colors.cardTertiary;
    switch (variant) {
      case 'primary':
        return colors.card; // White button on colored background
      case 'secondary':
        return colors.glassBackground;
      case 'outline':
        return 'transparent';
      case 'ghost':
        return 'transparent';
      default:
        return colors.card;
    }
  };

  // Text color: dark on white buttons, light on transparent
  const getTextColor = () => {
    if (disabled) return colors.textMuted;
    switch (variant) {
      case 'primary':
        return colors.background; // Accent color text on white button
      case 'secondary':
        return colors.text;
      case 'outline':
        return colors.text;
      case 'ghost':
        return colors.text;
      default:
        return colors.background;
    }
  };

  const getBorderColor = () => {
    if (variant === 'outline') {
      return disabled ? colors.textMuted : colors.border;
    }
    return 'transparent';
  };

  const getHeight = () => {
    switch (size) {
      case 'sm':
        return 40;
      case 'md':
        return LAYOUT.buttonHeight;
      case 'lg':
        return 60;
      default:
        return LAYOUT.buttonHeight;
    }
  };

  const getPadding = () => {
    switch (size) {
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

  return (
    <AnimatedTouchable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.button,
        animatedStyle,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          height: getHeight(),
          paddingHorizontal: getPadding(),
          width: fullWidth ? '100%' : undefined,
        },
        variant === 'primary' && !disabled && SHADOWS.lg,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <>
          {icon && iconPosition === 'left' && <React.Fragment>{icon}</React.Fragment>}
          <Text
            style={[
              styles.text,
              typography.labelLarge,
              { color: getTextColor() },
              icon && iconPosition === 'left' && { marginLeft: SPACING.sm },
              icon && iconPosition === 'right' && { marginRight: SPACING.sm },
              textStyle,
            ]}
          >
            {children}
          </Text>
          {icon && iconPosition === 'right' && <React.Fragment>{icon}</React.Fragment>}
        </>
      )}
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
  },
  text: {
    textAlign: 'center',
    fontWeight: '600',
  },
});
