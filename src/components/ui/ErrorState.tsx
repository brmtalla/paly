import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';
import { SPACING } from '../../theme/spacing';
import { Button } from './Button';
import { Card } from './Card';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = 'Something went wrong. Please try again.',
  onRetry,
}: ErrorStateProps) {
  const { colors } = useTheme();

  return (
    <Card variant="default" padding="xl">
      <View style={styles.container}>
        <Ionicons name="cloud-offline-outline" size={40} color={colors.error} />
        <Text
          style={[
            typography.bodyMedium,
            { color: colors.cardTextSecondary, textAlign: 'center', marginTop: SPACING.md },
          ]}
        >
          {message}
        </Text>
        {onRetry && (
          <Button variant="primary" size="sm" onPress={onRetry} style={{ marginTop: SPACING.lg }}>
            Try Again
          </Button>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
});
