import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useTheme } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { SPACING, LAYOUT, RADIUS } from '../../src/theme/spacing';
import { Card, Button } from '../../src/components/ui';
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
  { id: 'early-morning', label: 'Early Morning', start: '06:00', end: '08:00', isBlocked: false },
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
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchAvailability();
  }, []);

  const fetchAvailability = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('availability_blocks')
        .select('*')
        .eq('user_id', profile.id)
        .eq('is_recurring', true);

      if (error) throw error;

      if (data && data.length > 0) {
        // Update blocks based on stored data
        const updatedBlocks = DEFAULT_BLOCKS.map(block => {
          const isBlocked = data.some(
            d => d.start_time === block.start && d.end_time === block.end
          );
          return { ...block, isBlocked };
        });
        setBlocks(updatedBlocks);
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
    }
  };

  const toggleBlock = (id: string) => {
    setBlocks(blocks.map(b => (b.id === id ? { ...b, isBlocked: !b.isBlocked } : b)));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!profile?.id) return;

    setIsLoading(true);
    try {
      // Delete existing blocks
      await supabase
        .from('availability_blocks')
        .delete()
        .eq('user_id', profile.id)
        .eq('is_recurring', true);

      // Insert new blocked times
      const blockedTimes = blocks.filter(b => b.isBlocked);
      if (blockedTimes.length > 0) {
        const { error } = await supabase.from('availability_blocks').insert(
          blockedTimes.map(block => ({
            user_id: profile.id,
            start_time: block.start,
            end_time: block.end,
            is_recurring: true,
          }))
        );

        if (error) throw error;
      }

      setHasChanges(false);
      Alert.alert('Success', 'Your availability has been updated');
    } catch (error) {
      console.error('Error saving availability:', error);
      Alert.alert('Error', 'Failed to save availability');
    } finally {
      setIsLoading(false);
    }
  };

  const availableCount = blocks.filter(b => !b.isBlocked).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(400)}
          style={styles.header}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[typography.titleLarge, { color: colors.text }]}>
            Availability
          </Text>
          <View style={{ width: 40 }} />
        </Animated.View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Info */}
          <Animated.View entering={FadeInUp.delay(200).duration(600).springify()}>
            <View style={[styles.infoCard, { backgroundColor: colors.accentLight }]}>
              <Ionicons name="time-outline" size={20} color={colors.accent} />
              <Text style={[typography.bodyMedium, { color: colors.accent, flex: 1 }]}>
                Block off times when you're too busy for study reminders
              </Text>
            </View>
          </Animated.View>

          {/* Time blocks */}
          <Animated.View
            entering={FadeInUp.delay(300).duration(600).springify()}
            style={styles.blocksSection}
          >
            <Text style={[typography.labelSmall, { color: colors.textMuted, marginBottom: SPACING.sm }]}>
              TAP TO TOGGLE AVAILABILITY
            </Text>
            
            {blocks.map((block, index) => (
              <Animated.View
                key={block.id}
                entering={FadeInUp.delay(index * 100 + 400).duration(400)}
              >
                <TouchableOpacity onPress={() => toggleBlock(block.id)} activeOpacity={0.7}>
                  <Card
                    variant={block.isBlocked ? 'default' : 'accent'}
                    padding="lg"
                    style={[styles.blockCard, block.isBlocked && { opacity: 0.6 }]}
                  >
                    <View style={styles.blockContent}>
                      <View>
                        <Text
                          style={[
                            typography.titleMedium,
                            { color: block.isBlocked ? colors.textTertiary : colors.text },
                          ]}
                        >
                          {block.label}
                        </Text>
                        <Text
                          style={[
                            typography.bodySmall,
                            { color: block.isBlocked ? colors.textMuted : colors.textSecondary },
                          ]}
                        >
                          {block.start} - {block.end}
                        </Text>
                      </View>
                      
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: block.isBlocked
                              ? colors.backgroundTertiary
                              : colors.accent,
                          },
                        ]}
                      >
                        <Ionicons
                          name={block.isBlocked ? 'close' : 'checkmark'}
                          size={18}
                          color={block.isBlocked ? colors.textMuted : '#FFFFFF'}
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
            entering={FadeInUp.delay(700).duration(400)}
            style={[styles.summary, { backgroundColor: colors.backgroundSecondary }]}
          >
            <Ionicons name="notifications-outline" size={20} color={colors.accent} />
            <Text style={[typography.bodyMedium, { color: colors.textSecondary, flex: 1 }]}>
              Study prompts will be sent during{' '}
              <Text style={{ color: colors.accent, fontWeight: '600' }}>
                {availableCount} time {availableCount === 1 ? 'window' : 'windows'}
              </Text>
            </Text>
          </Animated.View>
        </ScrollView>

        {/* Save button */}
        {hasChanges && (
          <Animated.View
            entering={FadeInUp.duration(400)}
            style={styles.footer}
          >
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onPress={handleSave}
              loading={isLoading}
            >
              Save Changes
            </Button>
          </Animated.View>
        )}
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: LAYOUT.screenPadding,
    paddingVertical: SPACING.md,
  },
  backButton: {
    padding: SPACING.xs,
  },
  scrollContent: {
    paddingHorizontal: LAYOUT.screenPadding,
    paddingBottom: SPACING['3xl'],
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.xl,
  },
  blocksSection: {
    gap: SPACING.sm,
  },
  blockCard: {
    marginBottom: SPACING.sm,
  },
  blockContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
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
  footer: {
    paddingHorizontal: LAYOUT.screenPadding,
    paddingBottom: SPACING.xl,
  },
});


