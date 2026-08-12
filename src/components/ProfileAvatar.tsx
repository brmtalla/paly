import React from 'react';
import { Image, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface ProfileAvatarProps {
  avatarUrl?: string | null;
  fallback: string;
  size: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export function ProfileAvatar({
  avatarUrl,
  fallback,
  size,
  borderRadius = Math.round(size * 0.3),
  style,
}: ProfileAvatarProps) {
  const { colors } = useTheme();
  const shape = { width: size, height: size, borderRadius };

  return (
    <View style={[styles.container, shape, { backgroundColor: colors.card }, style]}>
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          accessibilityLabel="Profile picture"
          style={[styles.image, shape]}
        />
      ) : (
        <Text
          style={[styles.fallback, { color: colors.background, fontSize: Math.round(size * 0.38) }]}
        >
          {fallback.charAt(0).toUpperCase() || 'U'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    resizeMode: 'cover',
  },
  fallback: {
    fontWeight: '600',
  },
});
