import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useTheme } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { SPACING, LAYOUT } from '../../src/theme/spacing';
import { Card, Button, Input } from '../../src/components/ui';
import { useAuthStore } from '../../src/stores/authStore';
import { Ionicons } from '@expo/vector-icons';

const SUGGESTED_NAMES = ['Paly', 'Athena', 'Nova', 'Sage', 'Echo', 'Quinn', 'Orion', 'Zara'];

export default function CompanionScreen() {
  const { colors } = useTheme();
  const { profile, updateProfile } = useAuthStore();
  const [name, setName] = useState(profile?.assistant_name || 'Paly');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Invalid Name', 'Please enter a name for your companion');
      return;
    }

    setIsLoading(true);
    try {
      await updateProfile({ assistant_name: name.trim() });
      Alert.alert('Success', `Your companion is now called ${name.trim()}!`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to update companion name');
    } finally {
      setIsLoading(false);
    }
  };

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
            Companion Name
          </Text>
          <View style={{ width: 40 }} />
        </Animated.View>

        <View style={styles.content}>
          {/* Preview */}
          <Animated.View
            entering={FadeInUp.delay(200).duration(600).springify()}
            style={styles.previewSection}
          >
            <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
              <Text style={styles.avatarText}>
                {name.charAt(0).toUpperCase() || 'P'}
              </Text>
            </View>
            <Text style={[typography.headlineMedium, { color: colors.text, marginTop: SPACING.md }]}>
              {name || 'Your Companion'}
            </Text>
          </Animated.View>

          {/* Input */}
          <Animated.View entering={FadeInUp.delay(300).duration(600).springify()}>
            <Input
              label="Companion Name"
              value={name}
              onChangeText={setName}
              placeholder="Enter a name"
              maxLength={20}
            />
          </Animated.View>

          {/* Suggestions */}
          <Animated.View
            entering={FadeInUp.delay(400).duration(600).springify()}
            style={styles.suggestionsSection}
          >
            <Text style={[typography.labelSmall, { color: colors.textMuted, marginBottom: SPACING.sm }]}>
              SUGGESTIONS
            </Text>
            <View style={styles.suggestions}>
              {SUGGESTED_NAMES.map(suggestion => (
                <Card
                  key={suggestion}
                  variant={name === suggestion ? 'elevated' : 'default'}
                  padding="sm"
                  onPress={() => setName(suggestion)}
                  style={{
                    ...styles.suggestionChip,
                    ...(name === suggestion ? { backgroundColor: colors.background } : {}),
                  }}
                >
                  <Text
                    style={[
                      typography.labelMedium,
                      { color: name === suggestion ? colors.text : colors.cardText },
                    ]}
                  >
                    {suggestion}
                  </Text>
                </Card>
              ))}
            </View>
          </Animated.View>

          {/* Preview message */}
          <Animated.View
            entering={FadeInUp.delay(500).duration(600).springify()}
            style={styles.previewMessage}
          >
            <Card variant="glass" padding="lg">
              <Text style={[typography.bodyMedium, { color: colors.textSecondary, fontStyle: 'italic' }]}>
                "Hey! {name || 'I'}'s here to help you study. Ready for today's review?"
              </Text>
            </Card>
          </Animated.View>
        </View>

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
            disabled={!name.trim() || name === profile?.assistant_name}
          >
            Save Changes
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
    flex: 1,
    paddingHorizontal: LAYOUT.screenPadding,
  },
  previewSection: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '600',
  },
  suggestionsSection: {
    marginTop: SPACING.lg,
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  suggestionChip: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  previewMessage: {
    marginTop: SPACING.xl,
  },
  footer: {
    paddingHorizontal: LAYOUT.screenPadding,
    paddingBottom: SPACING.xl,
  },
});


