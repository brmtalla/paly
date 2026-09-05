import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextInputProps,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';
import { SPACING, RADIUS, LAYOUT, SHADOWS } from '../../theme/spacing';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  isPassword?: boolean;
  variant?: 'card' | 'glass';
}

export function Input({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  containerStyle,
  isPassword = false,
  variant = 'card',
  ...props
}: InputProps) {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const borderColor = useSharedValue(colors.border);
  const isGlass = variant === 'glass';
  const inputTextColor = isGlass ? colors.text : colors.cardText;
  const placeholderColor = isGlass ? colors.textMuted : colors.cardTextMuted;

  // Only use animated styles on native platforms
  const animatedBorderStyle = useAnimatedStyle(() => {
    if (Platform.OS === 'web') {
      return {};
    }
    return {
      borderColor: borderColor.value,
    };
  });

  const handleFocus = () => {
    setIsFocused(true);
    if (Platform.OS !== 'web') {
      borderColor.value = withTiming(colors.white, { duration: 150 });
    }
    props.onFocus?.({} as any);
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (Platform.OS !== 'web') {
      borderColor.value = withTiming(error ? colors.error : colors.border, { duration: 150 });
    }
    props.onBlur?.({} as any);
  };

  // Get border color for web (CSS transition handles animation)
  const getBorderColor = () => {
    if (error) return colors.error;
    if (isFocused) return colors.white;
    return colors.border;
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, typography.labelMedium, { color: colors.text }]}>{label}</Text>
      )}

      <Animated.View
        style={[
          styles.inputContainer,
          {
            backgroundColor: isGlass ? colors.glassBackground : colors.card,
            borderColor:
              Platform.OS === 'web' ? getBorderColor() : error ? colors.error : colors.border,
            // `transition` is a web-only CSS property with no RN equivalent.
            ...(Platform.OS === 'web' ? { transition: 'border-color 150ms ease' } : {}),
          } as ViewStyle,
          SHADOWS.sm,
          animatedBorderStyle,
        ]}
      >
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}

        <TextInput
          {...props}
          accessibilityLabel={props.accessibilityLabel ?? label ?? props.placeholder}
          style={[
            styles.input,
            {
              fontSize: typography.bodyLarge.fontSize,
              fontWeight: typography.bodyLarge.fontWeight,
              color: inputTextColor,
              lineHeight: undefined,
            },
            !!leftIcon && { paddingLeft: 0 },
            !!(rightIcon || isPassword) && { paddingRight: 0 },
            props.style,
          ]}
          placeholderTextColor={placeholderColor}
          onFocus={handleFocus}
          onBlur={handleBlur}
          secureTextEntry={isPassword && !showPassword}
        />

        {isPassword && (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.rightIcon}>
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color={placeholderColor}
            />
          </TouchableOpacity>
        )}

        {rightIcon && !isPassword && <View style={styles.rightIcon}>{rightIcon}</View>}
      </Animated.View>

      {(error || hint) && (
        <Text
          style={[
            styles.helper,
            typography.bodySmall,
            { color: error ? colors.error : colors.textSecondary },
          ]}
        >
          {error || hint}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.lg,
  },
  label: {
    marginBottom: SPACING.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: LAYOUT.inputHeight,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    paddingHorizontal: SPACING.lg,
  },
  input: {
    flex: 1,
    minHeight: LAYOUT.inputHeight,
    textAlignVertical: 'center',
    paddingVertical: SPACING.sm,
    margin: 0,
    includeFontPadding: false,
  },
  leftIcon: {
    marginRight: SPACING.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightIcon: {
    width: LAYOUT.minTouchTarget,
    height: LAYOUT.minTouchTarget,
    marginLeft: SPACING.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  helper: {
    marginTop: SPACING.xs,
  },
});
