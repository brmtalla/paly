import React, { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Background, Button, Card } from '../../src/components/ui';
import { FREE_CLASS_LIMIT } from '../../src/stores/subscriptionStore';
import { SUPPORT_EMAIL, TRIAL_DAYS } from '../../src/lib/constants';
import { useTheme } from '../../src/theme/ThemeContext';
import { LAYOUT, SPACING } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';

const FAQS = [
  {
    question: 'How does Paly turn my notes into study material?',
    answer:
      'Add notes to a class and Paly organizes the important ideas into short study chunks, flashcards, and quizzes you can review over time.',
  },
  {
    question: 'What is included in the free plan?',
    answer: `The free plan supports up to ${FREE_CLASS_LIMIT} classes and includes in-app study chunks, quizzes, and notifications. Paly Pro adds study texts, text-message replies, flashcards, chunks on demand, and unlimited classes.`,
  },
  {
    question: 'How does the Paly Pro trial work?',
    answer: `Eligible accounts can try Paly Pro free for ${TRIAL_DAYS} days. The subscription screen shows the price and renewal terms before you confirm with Apple. You can manage or cancel through your Apple subscriptions.`,
  },
  {
    question: 'How do I receive study texts?',
    answer:
      'Link your phone number when Paly asks during setup. Send the prefilled message so your number is connected to the correct account. Message and data rates may apply, and you can reply STOP at any time.',
  },
  {
    question: 'Can I change my companion name?',
    answer:
      'Yes. Open Profile, choose Study Companion, enter the name you want, and save your changes.',
  },
  {
    question: 'How do I change my schedule or reminders?',
    answer:
      'Open Profile to edit your availability or notification settings. Your class schedule can be updated from the class itself.',
  },
  {
    question: 'How do I restore a subscription?',
    answer:
      'Open Profile, choose Subscription, then tap Restore Purchases. Use the same Apple ID that made the original purchase.',
  },
  {
    question: 'How do I delete my account?',
    answer:
      'Open Profile, choose Account, then tap Delete Account. This permanently removes your account and associated data.',
  },
] as const;

export default function HelpScreen() {
  const { colors } = useTheme();

  return (
    <Background>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.header}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text
            style={[typography.titleLarge, { color: colors.text, flex: 1, textAlign: 'center' }]}
          >
            Help & FAQ
          </Text>
          <View style={styles.headerSpacer} />
        </Animated.View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInUp.delay(200).duration(500)}>
            <Text style={[typography.bodyLarge, { color: colors.textSecondary }]}>
              Quick answers about studying, texts, subscriptions, and your account.
            </Text>
          </Animated.View>

          <View style={styles.faqList}>
            {FAQS.map((faq, index) => (
              <Animated.View
                key={faq.question}
                entering={FadeInUp.delay(240 + index * 45).duration(450)}
              >
                <FaqItem question={faq.question} answer={faq.answer} />
              </Animated.View>
            ))}
          </View>

          <Animated.View entering={FadeInUp.delay(650).duration(500)} style={styles.support}>
            <Text style={[typography.headlineSmall, { color: colors.text }]}>Still need help?</Text>
            <Text
              style={[
                typography.bodyMedium,
                { color: colors.textSecondary, marginTop: SPACING.xs },
              ]}
            >
              Send us an email and include the email address on your Paly account.
            </Text>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              icon={<Ionicons name="mail-outline" size={20} color={colors.accent} />}
              style={{ marginTop: SPACING.lg }}
              onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Paly%20Support`)}
            >
              Contact Support
            </Button>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </Background>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const { colors } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card padding="none">
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        activeOpacity={0.75}
        onPress={() => setIsOpen((open) => !open)}
        style={styles.question}
      >
        <Text style={[typography.titleSmall, { color: colors.cardText, flex: 1 }]}>{question}</Text>
        <Ionicons
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.cardTextMuted}
        />
      </TouchableOpacity>
      {isOpen ? (
        <Text style={[typography.bodyMedium, styles.answer, { color: colors.cardTextSecondary }]}>
          {answer}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
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
  headerSpacer: {
    width: LAYOUT.minTouchTarget,
  },
  content: {
    paddingHorizontal: LAYOUT.screenPadding,
    paddingBottom: SPACING['3xl'],
  },
  faqList: {
    marginTop: SPACING.xl,
    gap: SPACING.md,
  },
  question: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  answer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  support: {
    marginTop: SPACING['2xl'],
  },
});
