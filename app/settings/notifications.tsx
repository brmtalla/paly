import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert, ScrollView } from 'react-native';
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
  const { profile, updateProfile, fetchProfile } = useAuthStore();
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

  // profiles.sms_opted_in is the flag the delivery job actually consults;
  // notification_preferences.sms_enabled is read by nothing. Showing the latter
  // here meant a student could switch texts "off" and keep receiving them.
  const smsLinked = !!profile?.phone_number;
  const smsOptedIn = smsLinked && !!profile?.sms_opted_in;

  const smsDescription = !smsLinked
    ? 'Text your link code from Onboarding to receive study texts'
    : smsOptedIn
      ? 'Study chunks are delivered to your Messages thread'
      : "You've opted out. Reply START to any Paly text to resume.";

  /**
   * Opting out is one-way from here: opting back in requires proof the handset
   * is theirs, which only arrives through an inbound text.
   */
  const handleSmsToggle = async (value: boolean) => {
    if (value) {
      Alert.alert(
        'Turn study texts back on',
        'Reply START to any Paly text from the phone you linked, and texts will resume.'
      );
      return;
    }

    try {
      const { error } = await supabase.rpc('revoke_sms_consent');
      if (error) throw error;
      await fetchProfile();
    } catch (error) {
      console.error('Error opting out of SMS:', error);
      Alert.alert('Error', 'Could not turn off study texts. Please try again.');
    }
  };

  const updatePreference = async (key: keyof NotificationPrefs, value: boolean) => {
    if (!profile?.id) return;

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
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.header}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[typography.titleLarge, { color: colors.text }]}>Notifications</Text>
          <View style={{ width: LAYOUT.minTouchTarget }} />
        </Animated.View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
                title="Study Texts"
                description={smsDescription}
                value={smsOptedIn}
                onToggle={handleSmsToggle}
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
                title="Study Nuggets"
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
        </ScrollView>
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
    width: '100%',
    maxWidth: LAYOUT.maxContentWidth,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: LAYOUT.screenPadding,
    paddingVertical: SPACING.md,
  },
  backButton: {
    width: LAYOUT.minTouchTarget,
    height: LAYOUT.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: LAYOUT.screenPadding,
    paddingBottom: SPACING['2xl'],
  },
  section: {
    marginTop: SPACING.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    gap: SPACING.md,
    minHeight: 76,
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
