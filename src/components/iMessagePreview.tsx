import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/typography';
import { SPACING, RADIUS } from '../theme/spacing';

/** iMessage blue, so the mockup reads instantly as a real text thread. */
const IMESSAGE_BLUE = '#248BF5';

interface Bubble {
  text: string;
  /** Outgoing (blue, right) vs incoming from Paly (grey, left). */
  outgoing?: boolean;
}

const SAMPLE_THREAD: Bubble[] = [
  {
    text: 'Paly here! 📚\n\n[Key Takeaway - Day 2]\nOrganic Chemistry\n\n• STEREOISOMERS: Same formula and connectivity, different 3D arrangement\n• Enantiomers are non-superimposable mirror images',
  },
  { text: 'wait so diastereomers arent mirror images?', outgoing: true },
  {
    text: 'Exactly — diastereomers differ at some stereocenters but not all. Quiz on this before Thursday 👀',
  },
];

interface Props {
  /** Optional caption rendered under the phone frame. */
  caption?: string;
  delay?: number;
}

/**
 * A static mockup of the Paly text thread, used to show what SMS/iMessage
 * delivery feels like before the user has it. Purely illustrative — it never
 * claims to be a real conversation from the user's own device.
 */
export function IMessagePreview({ caption, delay = 0 }: Props) {
  const { colors } = useTheme();

  return (
    <Animated.View entering={FadeInUp.delay(delay).duration(600).springify()}>
      <View style={[styles.phone, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Thread header */}
        <View style={[styles.threadHeader, { borderBottomColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
            <Text style={styles.avatarText}>P</Text>
          </View>
          <Text style={[typography.labelMedium, { color: colors.cardText }]}>Paly</Text>
        </View>

        <View style={styles.thread}>
          {SAMPLE_THREAD.map((bubble, i) => (
            <View
              key={i}
              style={[
                styles.bubble,
                bubble.outgoing
                  ? {
                      backgroundColor: IMESSAGE_BLUE,
                      alignSelf: 'flex-end',
                      borderBottomRightRadius: 4,
                    }
                  : {
                      backgroundColor: colors.backgroundSecondary,
                      alignSelf: 'flex-start',
                      borderBottomLeftRadius: 4,
                    },
              ]}
            >
              <Text
                style={[
                  typography.bodySmall,
                  { color: bubble.outgoing ? '#FFFFFF' : colors.cardText },
                ]}
              >
                {bubble.text}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {caption ? (
        <Text
          style={[
            typography.bodySmall,
            { color: colors.textSecondary, textAlign: 'center', marginTop: SPACING.sm },
          ]}
        >
          {caption}
        </Text>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  phone: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  threadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  thread: {
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  bubble: {
    maxWidth: '88%',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
  },
});
