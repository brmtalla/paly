import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, AccessibilityInfo } from 'react-native';
import Animated, {
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/typography';
import { SPACING, RADIUS } from '../theme/spacing';

/** iMessage blue, so the mockup reads instantly as a real text thread. */
const IMESSAGE_BLUE = '#248BF5';

interface Bubble {
  text: string;
  /** Outgoing (blue, right) vs incoming from the companion (grey, left). */
  outgoing?: boolean;
  /** Rendered as a study chunk header rather than prose. */
  chunk?: { label: string; className: string };
  /** How long the typing indicator shows before this lands, in ms. */
  typingFor?: number;
}

/**
 * The same exchange the landing page plays, so what a student is sold is what
 * they are shown. The back-and-forth in the middle is the Pro feature — a
 * question answered out of their own material.
 */
const SAMPLE_THREAD: Bubble[] = [
  {
    typingFor: 700,
    chunk: { label: 'Key Takeaway · Day 2', className: 'Organic Chemistry II' },
    text: '• STEREOCENTRES: a carbon with four different groups attached\n• That one feature is what makes a molecule chiral — impossible to superimpose on its own mirror image',
  },
  { text: 'wait so diastereomers arent mirror images?', outgoing: true },
  {
    typingFor: 1100,
    text: "Right — enantiomers are the mirror images. Diastereomers differ at some stereocentres but not all, so their melting points and solubility actually differ. That's the bit the quiz will go after 👀",
  },
  { text: 'ok that finally clicked', outgoing: true },
  {
    typingFor: 700,
    text: "Nice. That's 4 days in a row — I'll send Thursday's before class 🔥",
  },
];

interface Props {
  /** Optional caption rendered under the phone frame. */
  caption?: string;
  /** Whatever the student has named their companion, once they have. */
  assistantName?: string;
  delay?: number;
}

function TypingDots({ color }: { color: string }) {
  return (
    <View style={styles.typingRow}>
      {[0, 1, 2].map((i) => (
        <TypingDot key={i} color={color} index={i} />
      ))}
    </View>
  );
}

function TypingDot({ color, index }: { color: string; index: number }) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    // Staggered so the three dots ripple rather than blink in unison.
    const start = setTimeout(() => {
      opacity.value = withRepeat(
        withSequence(withTiming(1, { duration: 420 }), withTiming(0.3, { duration: 420 })),
        -1,
        false
      );
    }, index * 160);

    return () => {
      clearTimeout(start);
      cancelAnimation(opacity);
    };
  }, [index, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View style={[styles.typingDot, { backgroundColor: color }, style]} />;
}

/**
 * A mockup of the Paly text thread that plays out message by message, used to
 * show what SMS/iMessage delivery feels like before the student has it. Purely
 * illustrative — it never claims to be a real conversation from their device.
 */
export function IMessagePreview({ caption, assistantName = 'Paly', delay = 0 }: Props) {
  const { colors } = useTheme();
  // -1 so the thread starts empty and fills in.
  const [shown, setShown] = useState(-1);
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const playFrom = (index: number) => {
      if (cancelled || index >= SAMPLE_THREAD.length) return;
      const message = SAMPLE_THREAD[index];

      const reveal = () => {
        if (cancelled) return;
        setTyping(false);
        setShown(index);
        // A beat to read before the next one arrives.
        timers.push(
          setTimeout(() => playFrom(index + 1), message.outgoing ? 700 : 1500)
        );
      };

      if (message.typingFor) {
        setTyping(true);
        timers.push(setTimeout(reveal, message.typingFor));
      } else {
        timers.push(setTimeout(reveal, 350));
      }
    };

    // An animation nobody can follow is worse than no animation, so honour the
    // system setting and jump straight to the finished thread.
    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (cancelled) return;
      if (reduceMotion) {
        setShown(SAMPLE_THREAD.length - 1);
        return;
      }
      timers.push(setTimeout(() => playFrom(0), delay + 300));
    });

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [delay]);

  return (
    <Animated.View entering={FadeInUp.delay(delay).duration(600).springify()}>
      <View style={[styles.phone, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Thread header */}
        <View style={[styles.threadHeader, { borderBottomColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
            <Text style={styles.avatarText}>{assistantName.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={[typography.labelMedium, { color: colors.cardText }]}>{assistantName}</Text>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.threadScroll}
          contentContainerStyle={styles.thread}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {SAMPLE_THREAD.map((bubble, i) => {
            if (i > shown) return null;

            return (
              <Animated.View
                key={i}
                entering={FadeInUp.duration(320)}
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
                {bubble.chunk && (
                  <>
                    <Text style={[typography.labelSmall, { color: colors.accent }]}>
                      {bubble.chunk.label.toUpperCase()}
                    </Text>
                    <Text
                      style={[
                        typography.labelSmall,
                        { color: colors.textMuted, marginBottom: SPACING.xs },
                      ]}
                    >
                      {bubble.chunk.className}
                    </Text>
                  </>
                )}
                <Text
                  style={[
                    typography.bodySmall,
                    { color: bubble.outgoing ? '#FFFFFF' : colors.cardText },
                  ]}
                >
                  {bubble.text}
                </Text>
              </Animated.View>
            );
          })}

          {typing && (
            <Animated.View
              entering={FadeInUp.duration(220)}
              style={[
                styles.bubble,
                styles.typingBubble,
                { backgroundColor: colors.backgroundSecondary },
              ]}
            >
              <TypingDots color={colors.textMuted} />
            </Animated.View>
          )}
        </ScrollView>
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
  // Fixed height so the thread filling in never shifts the rest of the screen
  // under the student's thumb mid-read.
  threadScroll: {
    height: 300,
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
  typingBubble: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    paddingVertical: SPACING.md,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
