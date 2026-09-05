import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useTheme } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { SPACING, LAYOUT, RADIUS } from '../../src/theme/spacing';
import { Button, Card } from '../../src/components/ui';
import { useAuthStore } from '../../src/stores/authStore';
import { supabase } from '../../src/lib/supabase';
import { Ionicons } from '@expo/vector-icons';

interface TimeBlock {
  id: string;
  label: string;
  start: string;
  end: string;
  isBlocked: boolean;
}

const DEFAULT_BLOCKS: TimeBlock[] = [
  { id: 'morning', label: 'Early Morning', start: '06:00', end: '08:00', isBlocked: false },
  { id: 'late-morning', label: 'Late Morning', start: '08:00', end: '12:00', isBlocked: false },
  { id: 'afternoon', label: 'Afternoon', start: '12:00', end: '17:00', isBlocked: false },
  { id: 'evening', label: 'Evening', start: '17:00', end: '21:00', isBlocked: false },
  { id: 'night', label: 'Night', start: '21:00', end: '23:00', isBlocked: true },
];

export default function AvailabilityScreen() {
  const { colors } = useTheme();
  const { profile } = useAuthStore();
  const [blocks, setBlocks] = useState<TimeBlock[]>(DEFAULT_BLOCKS);
  const [isLoading, setIsLoading] = useState(false);

  const toggleBlock = (id: string) => {
    setBlocks(blocks.map((b) => (b.id === id ? { ...b, isBlocked: !b.isBlocked } : b)));
  };

  const handleContinue = async () => {
    setIsLoading(true);
    try {
      // Save blocked availability times
      const blockedTimes = blocks.filter((b) => b.isBlocked);

      for (const block of blockedTimes) {
        // Save for all days (recurring)
        await supabase.from('availability_blocks').insert({
          user_id: profile!.id,
          start_time: block.start,
          end_time: block.end,
          is_recurring: true,
        });
      }

      router.push('/(onboarding)/complete');
    } catch (error) {
      console.error('Error saving availability:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const availableCount = blocks.filter((b) => !b.isBlocked).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        {/* Progress indicator */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.progress}>
          <View style={[styles.progressBar, { backgroundColor: colors.glassBackground }]}>
            <View style={[styles.progressFill, { backgroundColor: colors.card, width: '100%' }]} />
          </View>
          <Text style={[typography.labelSmall, { color: colors.textSecondary }]}>5 OF 5</Text>
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
            <View style={[styles.iconContainer, { backgroundColor: colors.glassBackground }]}>
              <Ionicons name="time-outline" size={36} color={colors.text} />
            </View>

            <Text style={[typography.displaySmall, { color: colors.text, textAlign: 'center' }]}>
              When can we{'\n'}reach you?
            </Text>
            <Text
              style={[
                typography.bodyLarge,
                { color: colors.textSecondary, textAlign: 'center', marginTop: SPACING.md },
              ]}
            >
              Block off times when you&apos;re too busy for study reminders. We&apos;ll only send
              nuggets during your available hours.
            </Text>
          </Animated.View>

          {/* Time blocks */}
          <Animated.View
            entering={FadeInUp.delay(400).duration(600).springify()}
            style={styles.blocksContainer}
          >
            {blocks.map((block, index) => (
              <Animated.View
                key={block.id}
                entering={FadeInUp.delay(index * 100 + 500).duration(400)}
              >
                <TouchableOpacity onPress={() => toggleBlock(block.id)} activeOpacity={0.7}>
                  <Card
                    variant={block.isBlocked ? 'solid' : 'default'}
                    padding="lg"
                    style={[styles.blockCard, block.isBlocked && { opacity: 0.7 }]}
                  >
                    <View style={styles.blockContent}>
                      <View>
                        <Text
                          style={[
                            typography.titleMedium,
                            {
                              color: block.isBlocked ? colors.textTertiary : colors.cardText,
                            },
                          ]}
                        >
                          {block.label}
                        </Text>
                        <Text
                          style={[
                            typography.bodySmall,
                            {
                              color: block.isBlocked ? colors.textMuted : colors.cardTextSecondary,
                              marginTop: 2,
                            },
                          ]}
                        >
                          {block.start} - {block.end}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.toggleIndicator,
                          {
                            backgroundColor: block.isBlocked
                              ? colors.glassBackground
                              : colors.background,
                          },
                        ]}
                      >
                        <Ionicons
                          name={block.isBlocked ? 'close' : 'checkmark'}
                          size={18}
                          color={block.isBlocked ? colors.textMuted : colors.text}
                        />
                      </View>
                    </View>
                  </Card>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </Animated.View>

          {/* Summary */}
          <Animated.View
            entering={FadeInUp.delay(800).duration(400)}
            style={[styles.summary, { backgroundColor: colors.glassBackground }]}
          >
            <Ionicons name="notifications-outline" size={20} color={colors.text} />
            <Text style={[typography.bodyMedium, { color: colors.textSecondary, flex: 1 }]}>
              Study nuggets will be sent during{' '}
              <Text style={{ color: colors.text, fontWeight: '600' }}>
                {availableCount} time {availableCount === 1 ? 'window' : 'windows'}
              </Text>
            </Text>
          </Animated.View>
        </ScrollView>

        {/* CTA */}
        <Animated.View entering={FadeInUp.delay(900).duration(600).springify()} style={styles.cta}>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={isLoading}
            onPress={handleContinue}
          >
            Complete Setup
          </Button>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: LAYOUT.maxContentWidth,
    alignSelf: 'center',
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
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xl,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  blocksContainer: {
    gap: SPACING.md,
  },
  blockCard: {
    marginBottom: 0,
  },
  blockContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginTop: SPACING.xl,
  },
  cta: {
    marginBottom: SPACING.lg,
  },
});
