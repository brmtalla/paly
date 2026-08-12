import React, { useState } from 'react';
import {
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useTheme } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { SPACING, LAYOUT, SHADOWS } from '../../src/theme/spacing';
import { Card, Button, Input, Background } from '../../src/components/ui';
import { useAuthStore } from '../../src/stores/authStore';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabase';
import { SUPPORT_EMAIL } from '../../src/lib/constants';
import { ProfileAvatar } from '../../src/components/ProfileAvatar';

export default function AccountScreen() {
  const { colors } = useTheme();
  const { profile, updateProfile, user } = useAuthStore();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [email, setEmail] = useState(profile?.email || user?.email || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [_emailChanged, setEmailChanged] = useState(false);

  const originalEmail = profile?.email || user?.email || '';
  const originalName = profile?.full_name || '';

  const hasChanges = fullName !== originalName || email !== originalEmail;
  const avatarFallback = fullName || email || 'U';

  const chooseAvatar = async () => {
    if (!user) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    setIsUploadingAvatar(true);
    try {
      const image = result.assets[0];
      const contentType = image.mimeType || 'image/jpeg';
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(contentType)) {
        throw new Error('Please choose a JPG, PNG, or WebP image.');
      }

      const imageData = await fetch(image.uri).then((response) => response.arrayBuffer());
      if (imageData.byteLength > 5 * 1024 * 1024) {
        throw new Error('Please choose an image smaller than 5 MB.');
      }

      const avatarPath = `${user.id}/avatar`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(avatarPath, imageData, {
          contentType,
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(avatarPath);
      await updateProfile({ avatar_url: `${data.publicUrl}?v=${Date.now()}` });
    } catch (error) {
      console.error('Avatar upload error:', error);
      Alert.alert(
        'Could Not Update Photo',
        error instanceof Error ? error.message : 'Please try again.'
      );
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const removeAvatar = async () => {
    if (!user) return;

    setIsUploadingAvatar(true);
    try {
      await updateProfile({ avatar_url: null });
      const { error } = await supabase.storage.from('avatars').remove([`${user.id}/avatar`]);
      if (error) console.warn('Avatar cleanup error:', error);
    } catch (error) {
      console.error('Avatar removal error:', error);
      Alert.alert('Could Not Remove Photo', 'Please try again.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const openAvatarMenu = () => {
    const actions: Parameters<typeof Alert.alert>[2] = [
      { text: 'Choose from Photos', onPress: () => void chooseAvatar() },
      ...(profile?.avatar_url
        ? [
            {
              text: 'Remove Photo',
              style: 'destructive' as const,
              onPress: () => void removeAvatar(),
            },
          ]
        : []),
      { text: 'Cancel', style: 'cancel' },
    ];

    Alert.alert('Profile Photo', undefined, actions);
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Invalid Name', 'Please enter your name');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      // Update profile name
      await updateProfile({ full_name: fullName.trim(), email: email.trim() });

      // If email changed, update auth email too
      if (email !== originalEmail) {
        const { error } = await supabase.auth.updateUser({ email: email.trim() });
        if (error) {
          Alert.alert(
            'Email Update',
            'Your profile was updated, but email change requires verification. Check your inbox.'
          );
          setEmailChanged(true);
        } else {
          Alert.alert(
            'Success',
            'A confirmation email has been sent to your new address. Please verify to complete the change.',
            [{ text: 'OK', onPress: () => router.back() }]
          );
          setEmailChanged(true);
          return;
        }
      } else {
        Alert.alert('Success', 'Your profile has been updated!', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (error) {
      console.error('Error updating account:', error);
      Alert.alert('Error', 'Failed to update account information');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Background>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[typography.titleLarge, { color: colors.text }]}>Account</Text>
          <View style={{ width: 40 }} />
        </Animated.View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar Preview */}
          <Animated.View
            entering={FadeInUp.delay(200).duration(600).springify()}
            style={styles.previewSection}
          >
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Change profile photo"
              activeOpacity={0.8}
              disabled={isUploadingAvatar}
              onPress={openAvatarMenu}
              style={styles.avatarButton}
            >
              <ProfileAvatar
                avatarUrl={profile?.avatar_url}
                fallback={avatarFallback}
                size={100}
                borderRadius={30}
                style={SHADOWS.lg}
              />
              <View style={[styles.cameraBadge, { backgroundColor: colors.accent }]}>
                <Ionicons name="camera" size={17} color="#FFFFFF" />
              </View>
              {isUploadingAvatar ? (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator color="#FFFFFF" />
                </View>
              ) : null}
            </TouchableOpacity>
            <Text style={[typography.labelMedium, { color: colors.text, marginTop: SPACING.md }]}>
              Change photo
            </Text>
          </Animated.View>

          {/* Name Input */}
          <Animated.View entering={FadeInUp.delay(300).duration(600).springify()}>
            <Input
              label="Full Name"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Enter your name"
              autoCapitalize="words"
              leftIcon={<Ionicons name="person-outline" size={20} color={colors.cardTextMuted} />}
            />
          </Animated.View>

          {/* Email Input */}
          <Animated.View
            entering={FadeInUp.delay(400).duration(600).springify()}
            style={{ marginTop: SPACING.lg }}
          >
            <Input
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              leftIcon={<Ionicons name="mail-outline" size={20} color={colors.cardTextMuted} />}
            />
            {email !== originalEmail && (
              <Text
                style={[typography.bodySmall, { color: colors.warning, marginTop: SPACING.xs }]}
              >
                Changing your email will require verification
              </Text>
            )}
          </Animated.View>

          {/* Info Card */}
          <Animated.View
            entering={FadeInUp.delay(500).duration(600).springify()}
            style={styles.infoSection}
          >
            <Card variant="default" padding="lg">
              <View style={styles.infoRow}>
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={colors.cardTextMuted}
                />
                <Text
                  style={[
                    typography.bodySmall,
                    { color: colors.cardTextSecondary, flex: 1, marginLeft: SPACING.sm },
                  ]}
                >
                  Your name will be used in greetings and throughout the app. Email changes require
                  verification.
                </Text>
              </View>
            </Card>
          </Animated.View>
        </ScrollView>

        {/* Save button */}
        <Animated.View
          entering={FadeInUp.delay(600).duration(600).springify()}
          style={styles.footer}
        >
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onPress={handleSave}
            loading={isLoading}
            disabled={!hasChanges || !fullName.trim()}
          >
            Save Changes
          </Button>
          <Button
            variant="ghost"
            size="md"
            fullWidth
            style={{ marginTop: SPACING.xl }}
            textStyle={{ color: colors.error }}
            onPress={() => {
              Alert.alert(
                'Delete Account',
                'This will permanently delete your account and all associated data. This action cannot be undone.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete Account',
                    style: 'destructive',
                    onPress: async () => {
                      const { deleteAccount } = useAuthStore.getState();
                      const { error: delError } = await deleteAccount();
                      if (delError) {
                        Alert.alert(
                          'Error',
                          `Could not delete account. Please contact ${SUPPORT_EMAIL} for help.`
                        );
                      }
                    },
                  },
                ]
              );
            }}
          >
            Delete Account
          </Button>
        </Animated.View>
      </SafeAreaView>
    </Background>
  );
}

const styles = StyleSheet.create({
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
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: LAYOUT.screenPadding,
    paddingBottom: SPACING.xl,
  },
  previewSection: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  avatarButton: {
    position: 'relative',
  },
  cameraBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  infoSection: {
    marginTop: SPACING.xl,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  footer: {
    paddingHorizontal: LAYOUT.screenPadding,
    paddingBottom: SPACING.xl,
  },
});
