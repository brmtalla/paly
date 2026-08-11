import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useTheme } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { SPACING, LAYOUT, RADIUS } from '../../src/theme/spacing';
import { Card } from '../../src/components/ui';
import { useAuthStore } from '../../src/stores/authStore';
import { supabase } from '../../src/lib/supabase';
import { Ionicons } from '@expo/vector-icons';

interface NotificationPrefs {
  push_enabled: boolean;
  sms_enabled: boolean;
  class_reminders: boolean;
  study_prompts: boolean;
  quiz_reminders: boolean;
}

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const { profile, updateProfile } = useAuthStore();
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    push_enabled: true,
    sms_enabled: false,
    class_reminders: true,
    study_prompts: true,
    quiz_reminders: true,
  });
  const [autoSynthesize, setAutoSynthesize] = useState(profile?.auto_synthesize ?? false);
  const [_isLoading, _setIsLoading] = useState(false);

  useEffect(() => {
    fetchPreferences();
    setAutoSynthesize(profile?.auto_synthesize ?? false);
  }, [profile?.auto_synthesize]);

  const fetchPreferences = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', profile.id)
        .single();

      if (error) throw error;
      if (data) {
        setPrefs({
          push_enabled: data.push_enabled,
          sms_enabled: data.sms_enabled,
          class_reminders: data.class_reminders,
          study_prompts: data.study_prompts,
          quiz_reminders: data.quiz_reminders,
        });
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    }
  };

  const updatePreference = async (key: keyof NotificationPrefs, value: boolean) => {
    if (!profile?.id) return;

    // SMS is the core, free experience — it is not gated behind a paywall.
    setPrefs((prev) => ({ ...prev, [key]: value }));

    try {
      const { error } = await supabase
        .from('notification_preferences')
        .update({ [key]: value })
        .eq('user_id', profile.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating preference:', error);
      // Revert on error
      setPrefs((prev) => ({ ...prev, [key]: !value }));
      Alert.alert('Error', 'Failed to update preference');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[typography.titleLarge, { color: colors.text }]}>Notifications</Text>
          <View style={{ width: 40 }} />
        </Animated.View>

        <View style={styles.content}>
          {/* Push Notifications */}
          <Animated.View entering={FadeInUp.delay(200).duration(600).springify()}>
            <Text
              style={[typography.labelSmall, { color: colors.textMuted, marginBottom: SPACING.sm }]}
            >
              DELIVERY METHOD
            </Text>
            <Card variant="elevated" padding="none">
              <NotificationRow
                icon="notifications"
                title="Push Notifications"
                description="Receive notifications on your device"
                value={prefs.push_enabled}
                onToggle={(value) => updatePreference('push_enabled', value)}
                colors={colors}
              />
              <NotificationRow
                icon="chatbubble"
                title="SMS Notifications"
                description="Get study prompts via text message"
                value={prefs.sms_enabled}
                onToggle={(value) => updatePreference('sms_enabled', value)}
                colors={colors}
                isLast
              />
            </Card>
          </Animated.View>

          {/* Notification Types */}
          <Animated.View
            entering={FadeInUp.delay(300).duration(600).springify()}
            style={styles.section}
          >
            <Text
              style={[typography.labelSmall, { color: colors.textMuted, marginBottom: SPACING.sm }]}
            >
              NOTIFICATION TYPES
            </Text>
            <Card variant="elevated" padding="none">
              <NotificationRow
                icon="school"
                title="Class Reminders"
                description="Get notified before your classes start"
                value={prefs.class_reminders}
                onToggle={(value) => updatePreference('class_reminders', value)}
                colors={colors}
              />
              <NotificationRow
                icon="sparkles"
                title="Study Prompts"
                description="Daily study reminders from your companion"
                value={prefs.study_prompts}
                onToggle={(value) => updatePreference('study_prompts', value)}
                colors={colors}
              />
              <NotificationRow
                icon="help-circle"
                title="Quiz Reminders"
                description="Weekly quiz notifications"
                value={prefs.quiz_reminders}
                onToggle={(value) => updatePreference('quiz_reminders', value)}
                colors={colors}
                isLast
              />
            </Card>
          </Animated.View>

          {/* Study Preferences */}
          <Animated.View
            entering={FadeInUp.delay(400).duration(600).springify()}
            style={styles.section}
          >
            <Text
              style={[typography.labelSmall, { color: colors.textMuted, marginBottom: SPACING.sm }]}
            >
              STUDY PREFERENCES
            </Text>
            <Card variant="elevated" padding="none">
              <View style={styles.row}>
                <View style={[styles.rowIcon, { backgroundColor: colors.backgroundSecondary }]}>
                  <Ionicons name="sparkles" size={18} color={colors.text} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.titleSmall, { color: colors.text }]}>
                    Auto-Synthesize
                  </Text>
                  <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                    Automatically synthesize notes on upload
                  </Text>
                </View>
                <Switch
                  value={autoSynthesize}
                  onValueChange={async (value) => {
                    setAutoSynthesize(value);
                    try {
                      await updateProfile({ auto_synthesize: value });
                    } catch {
                      setAutoSynthesize(!value);
                      Alert.alert('Error', 'Failed to update preference');
                    }
                  }}
                  trackColor={{ false: colors.backgroundTertiary, true: colors.accent + '60' }}
                  thumbColor={autoSynthesize ? colors.accent : colors.textMuted}
                />
              </View>
            </Card>
          </Animated.View>

          {/* Info */}
          <Animated.View
            entering={FadeInUp.delay(500).duration(600).springify()}
            style={styles.infoSection}
          >
            <View style={[styles.infoCard, { backgroundColor: colors.backgroundSecondary }]}>
              <Ionicons name="information-circle" size={20} color={colors.textMuted} />
              <Text style={[typography.bodySmall, { color: colors.textSecondary, flex: 1 }]}>
                {autoSynthesize
                  ? 'Uploads are synthesized automatically. Study texts start arriving right away.'
                  : "With auto-synthesize off, tap the glowing Synthesize button on your class page when you're ready."}
              </Text>
            </View>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

interface NotificationRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  value: boolean;
  onToggle: (value: boolean) => void;
  colors: any;
  isPremium?: boolean;
  isLast?: boolean;
}

function NotificationRow({
  icon,
  title,
  description,
  value,
  onToggle,
  colors,
  isPremium,
  isLast,
}: NotificationRowProps) {
  return (
    <View
      style={[
        styles.row,
        !isLast && { borderBottomWidth: 1, borderBottomColor: colors.backgroundSecondary },
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: colors.backgroundSecondary }]}>
        <Ionicons name={icon} size={18} color={colors.text} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.titleRow}>
          <Text style={[typography.titleSmall, { color: colors.text }]}>{title}</Text>
          {isPremium && (
            <View style={[styles.premiumBadge, { backgroundColor: colors.accent + '20' }]}>
              <Ionicons name="diamond" size={10} color={colors.accent} />
              <Text style={[styles.premiumText, { color: colors.accent }]}>PRO</Text>
            </View>
          )}
        </View>
        <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.backgroundTertiary, true: colors.accent + '60' }}
        thumbColor={value ? colors.accent : colors.textMuted}
      />
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
  content: {
    paddingHorizontal: LAYOUT.screenPadding,
  },
  section: {
    marginTop: SPACING.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  premiumText: {
    fontSize: 9,
    fontWeight: '700',
  },
  infoSection: {
    marginTop: SPACING.xl,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
  },
});
