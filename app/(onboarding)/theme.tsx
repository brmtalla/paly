import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../../src/theme/ThemeContext';
import { THEME_COLORS, getRandomThemeColor, getDerivedColors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { SPACING, LAYOUT, RADIUS, SHADOWS } from '../../src/theme/spacing';
import { Button } from '../../src/components/ui';
import { useAuthStore } from '../../src/stores/authStore';
import { Ionicons } from '@expo/vector-icons';

export default function ThemeScreen() {
  const { colors, setAccentColor, accentColor } = useTheme();
  const { updateProfile, profile } = useAuthStore();
  const [selectedColor, setSelectedColor] = useState(accentColor);
  const [isLoading, setIsLoading] = useState(false);

  // Get derived colors for preview
  const _derivedColors = getDerivedColors(selectedColor);

  // Randomly assign a color on first load if not already set
  useEffect(() => {
    if (!profile?.theme_color || profile.theme_color === '#6366F1') {
      const randomColor = getRandomThemeColor();
      setSelectedColor(randomColor.value);
      setAccentColor(randomColor.value);
    }
  }, []);

  const handleColorSelect = (colorValue: string) => {
    setSelectedColor(colorValue);
    setAccentColor(colorValue);
  };

  const handleContinue = async () => {
    setIsLoading(true);
    try {
      await updateProfile({ theme_color: selectedColor });
      router.push('/(onboarding)/schedule');
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        {/* Progress indicator */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.progress}>
          <View style={[styles.progressBar, { backgroundColor: colors.glassBackground }]}>
            <View style={[styles.progressFill, { backgroundColor: colors.card, width: '50%' }]} />
          </View>
          <Text style={[typography.labelSmall, { color: colors.textSecondary }]}>2 OF 4</Text>
        </Animated.View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View
            entering={FadeInDown.delay(200).duration(600).springify()}
            style={styles.header}
          >
            <View style={[styles.colorPreview, { backgroundColor: colors.card, ...SHADOWS.lg }]}>
              <Ionicons name="color-palette" size={36} color={colors.onCard} />
            </View>

            <Text style={[typography.displaySmall, { color: colors.text, textAlign: 'center' }]}>
              Your personal{'\n'}color
            </Text>

            <Text
              style={[
                typography.bodyLarge,
                {
                  color: colors.textSecondary,
                  textAlign: 'center',
                  marginTop: SPACING.md,
                },
              ]}
            >
              This color will be your app&apos;s signature look. It becomes the main background with
              white cards as accents.
            </Text>
          </Animated.View>

          {/* Color grid */}
          <Animated.View
            entering={FadeInUp.delay(400).duration(600).springify()}
            style={styles.colorGrid}
          >
            {THEME_COLORS.map((color, index) => (
              <ColorOption
                key={color.value}
                color={color}
                isSelected={selectedColor === color.value}
                onSelect={() => handleColorSelect(color.value)}
                delay={index * 50}
              />
            ))}
          </Animated.View>

          {/* Preview card */}
          <Animated.View
            entering={FadeInUp.delay(600).duration(600).springify()}
            style={styles.previewSection}
          >
            <Text
              style={[
                typography.labelSmall,
                { color: colors.textSecondary, marginBottom: SPACING.md },
              ]}
            >
              PREVIEW
            </Text>

            {/* Mini preview of the full app look */}
            <View style={[styles.previewPhone, { backgroundColor: selectedColor }]}>
              <View style={[styles.previewCard, { backgroundColor: '#FFFFFF', ...SHADOWS.md }]}>
                <View style={styles.previewHeader}>
                  <View style={[styles.previewIndicator, { backgroundColor: selectedColor }]} />
                  <Text style={[typography.titleSmall, { color: '#1A1A1A' }]}>Biology 101</Text>
                </View>
                <Text style={[typography.bodySmall, { color: '#4A4A4A', marginTop: SPACING.xs }]}>
                  Today&apos;s study nugget is ready!
                </Text>
                <View style={styles.previewProgress}>
                  <View
                    style={[styles.previewProgressBar, { backgroundColor: selectedColor + '20' }]}
                  >
                    <View
                      style={[
                        styles.previewProgressFill,
                        { backgroundColor: selectedColor, width: '75%' },
                      ]}
                    />
                  </View>
                  <Text
                    style={[
                      typography.labelSmall,
                      { color: selectedColor, marginLeft: SPACING.sm },
                    ]}
                  >
                    75%
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>
        </ScrollView>

        {/* CTA */}
        <Animated.View entering={FadeInUp.delay(800).duration(600).springify()} style={styles.cta}>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={isLoading}
            onPress={handleContinue}
          >
            Continue
          </Button>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

interface ColorOptionProps {
  color: (typeof THEME_COLORS)[number];
  isSelected: boolean;
  onSelect: () => void;
  delay: number;
}

function ColorOption({ color, isSelected, onSelect, delay }: ColorOptionProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    if (Platform.OS === 'web') {
      return {};
    }
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = () => {
    if (Platform.OS !== 'web') {
      scale.value = withSpring(0.9, { damping: 15 });
    }
  };

  const handlePressOut = () => {
    if (Platform.OS !== 'web') {
      scale.value = withSpring(1, { damping: 15 });
    }
  };

  return (
    <Animated.View entering={FadeInUp.delay(delay).duration(400)} style={animatedStyle}>
      <TouchableOpacity
        onPress={onSelect}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
        style={[
          styles.colorOption,
          { backgroundColor: color.value },
          isSelected && styles.colorOptionSelected,
        ]}
      >
        {isSelected && <Ionicons name="checkmark" size={24} color="#FFFFFF" />}
      </TouchableOpacity>
      <Text style={[styles.colorName, { color: isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.6)' }]}>
        {color.name}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: LAYOUT.screenPadding,
  },
  progress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  scrollContent: {
    paddingBottom: SPACING['3xl'],
  },
  header: {
    alignItems: 'center',
    paddingTop: SPACING['2xl'],
    paddingBottom: SPACING.xl,
  },
  colorPreview: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  colorOption: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  colorName: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  previewSection: {
    marginTop: SPACING['2xl'],
  },
  previewPhone: {
    padding: SPACING.md,
    borderRadius: RADIUS.xl,
  },
  previewCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  previewIndicator: {
    width: 4,
    height: 20,
    borderRadius: 2,
  },
  previewProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  previewProgressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
  },
  previewProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  cta: {
    marginBottom: SPACING.lg,
  },
});
