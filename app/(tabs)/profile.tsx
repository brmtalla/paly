import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useTheme } from '../../src/theme/ThemeContext';
import { THEME_COLORS } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { SPACING, LAYOUT, RADIUS, SHADOWS } from '../../src/theme/spacing';
import { Card, Button, Background } from '../../src/components/ui';
import { useAuthStore } from '../../src/stores/authStore';
import { useSubscriptionStore } from '../../src/stores/subscriptionStore';
import { Ionicons } from '@expo/vector-icons';
import { PRIVACY_URL, SUPPORT_EMAIL, TERMS_URL } from '../../src/lib/constants';
import { ProfileAvatar } from '../../src/components/ProfileAvatar';

export default function ProfileScreen() {
  const { colors, setAccentColor, accentColor, toggleColorScheme, colorScheme } = useTheme();
  const { profile, signOut, updateProfile } = useAuthStore();
  const { isPro } = useSubscriptionStore();

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const handleColorChange = async (newColor: string) => {
    setAccentColor(newColor);
    try {
      await updateProfile({ theme_color: newColor });
    } catch (error) {
      console.error('Error updating theme color:', error);
    }
  };

  return (
    <Background>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View
            entering={FadeInDown.delay(100).duration(600).springify()}
            style={styles.header}
          >
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Edit account"
              onPress={() => router.push('/settings/account')}
              style={styles.headerContent}
              activeOpacity={0.7}
            >
              <ProfileAvatar
                avatarUrl={profile?.avatar_url}
                fallback={profile?.full_name || profile?.email || 'U'}
                size={80}
                borderRadius={24}
                style={SHADOWS.lg}
              />
              <View style={styles.headerText}>
                <View style={styles.nameRow}>
                  <Text style={[typography.headlineMedium, { color: colors.text }]}>
                    {profile?.full_name || 'Tap to add name'}
                  </Text>
                  <Ionicons
                    name="pencil"
                    size={16}
                    color={colors.textMuted}
                    style={{ marginLeft: SPACING.xs }}
                  />
                </View>
                <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>
                  {profile?.email}
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* Theme Color */}
          <Animated.View
            entering={FadeInUp.delay(200).duration(600).springify()}
            style={styles.section}
          >
            <Text
              style={[
                typography.labelSmall,
                { color: colors.textSecondary, marginBottom: SPACING.sm },
              ]}
            >
              YOUR COLOR
            </Text>
            <Card variant="default" padding="lg">
              <View style={styles.colorGrid}>
                {THEME_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color.value}
                    accessibilityRole="radio"
                    accessibilityLabel={`${color.name} theme`}
                    accessibilityState={{ selected: accentColor === color.value }}
                    onPress={() => handleColorChange(color.value)}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color.value },
                      accentColor === color.value && styles.colorSelected,
                    ]}
                  >
                    {accentColor === color.value && (
                      <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </Card>
          </Animated.View>

          {/* Settings */}
          <Animated.View
            entering={FadeInUp.delay(300).duration(600).springify()}
            style={styles.section}
          >
            <Text
              style={[
                typography.labelSmall,
                { color: colors.textSecondary, marginBottom: SPACING.sm },
              ]}
            >
              SETTINGS
            </Text>
            <Card variant="default" padding="none">
              <SettingsItem
                icon="person-circle-outline"
                label="Account"
                onPress={() => router.push('/settings/account')}
                colors={colors}
              />
              <SettingsItem
                icon="notifications-outline"
                label="Notifications"
                onPress={() => router.push('/settings/notifications')}
                colors={colors}
              />
              <SettingsItem
                icon="moon-outline"
                label="Dark Mode"
                onPress={toggleColorScheme}
                colors={colors}
                rightElement={
                  <View
                    style={[
                      styles.toggle,
                      {
                        backgroundColor:
                          colorScheme === 'dark' ? colors.background : colors.cardTertiary,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.toggleKnob,
                        {
                          backgroundColor: '#FFFFFF',
                          transform: [{ translateX: colorScheme === 'dark' ? 20 : 0 }],
                        },
                      ]}
                    />
                  </View>
                }
              />
              <SettingsItem
                icon="chatbubble-ellipses-outline"
                label="Companion Name"
                onPress={() => router.push('/settings/companion')}
                colors={colors}
              />
              <SettingsItem
                icon="time-outline"
                label="Availability"
                onPress={() => router.push('/settings/availability')}
                colors={colors}
              />
              <SettingsItem
                icon="card-outline"
                label="Subscription"
                onPress={() => router.push('/settings/subscription')}
                colors={colors}
                badge={isPro ? 'Pro' : 'Free'}
                badgeColor={isPro ? '#6366F1' : colors.cardTextMuted}
                isLast
              />
            </Card>
          </Animated.View>

          {/* Support */}
          <Animated.View
            entering={FadeInUp.delay(400).duration(600).springify()}
            style={styles.section}
          >
            <Text
              style={[
                typography.labelSmall,
                { color: colors.textSecondary, marginBottom: SPACING.sm },
              ]}
            >
              SUPPORT
            </Text>
            <Card variant="default" padding="none">
              <SettingsItem
                icon="help-circle-outline"
                label="Help & FAQ"
                onPress={() => router.push('/settings/help')}
                colors={colors}
              />
              <SettingsItem
                icon="chatbubble-outline"
                label="Contact Us"
                onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
                colors={colors}
              />
              <SettingsItem
                icon="document-text-outline"
                label="Terms of Service"
                onPress={() => Linking.openURL(TERMS_URL)}
                colors={colors}
              />
              <SettingsItem
                icon="shield-outline"
                label="Privacy Policy"
                onPress={() => Linking.openURL(PRIVACY_URL)}
                colors={colors}
                isLast
              />
            </Card>
          </Animated.View>

          {/* Sign Out */}
          <Animated.View
            entering={FadeInUp.delay(500).duration(600).springify()}
            style={styles.section}
          >
            <Button
              variant="ghost"
              size="lg"
              fullWidth
              onPress={handleSignOut}
              textStyle={{ color: colors.error }}
            >
              Sign Out
            </Button>
          </Animated.View>

          <Text
            style={[
              typography.bodySmall,
              { color: colors.textMuted, textAlign: 'center', marginTop: SPACING.lg },
            ]}
          >
            Paly v1.0.0
          </Text>
        </ScrollView>
      </SafeAreaView>
    </Background>
  );
}

interface SettingsItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  colors: any;
  rightElement?: React.ReactNode;
  badge?: string;
  badgeColor?: string;
  isLast?: boolean;
}

function SettingsItem({
  icon,
  label,
  onPress,
  colors,
  rightElement,
  badge,
  badgeColor,
  isLast,
}: SettingsItemProps) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.settingsItem,
        !isLast && { borderBottomWidth: 1, borderBottomColor: colors.cardSecondary },
      ]}
    >
      <View style={[styles.settingsIcon, { backgroundColor: colors.accent }]}>
        <Ionicons name={icon} size={18} color={colors.text} />
      </View>
      <Text style={[typography.bodyLarge, { color: colors.cardText, flex: 1 }]}>{label}</Text>
      {badge && (
        <View style={[styles.badge, { backgroundColor: badgeColor + '20' }]}>
          <Text style={[typography.labelSmall, { color: badgeColor }]}>{badge}</Text>
        </View>
      )}
      {rightElement || <Ionicons name="chevron-forward" size={20} color={colors.cardTextMuted} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: LAYOUT.screenPadding,
    paddingBottom: LAYOUT.tabBarContentInset,
  },
  header: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerText: {
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  section: {
    marginTop: SPACING.xl,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    justifyContent: 'center',
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorSelected: {
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  settingsIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    marginRight: SPACING.sm,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 4,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
});
