import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeInUp,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/typography';
import { SPACING } from '../theme/spacing';

const IMESSAGE_BLUE = '#248BF5';

interface Bubble {
  text: string;
  outgoing?: boolean;
  chunk?: { label: string; className: string };
  typingFor?: number;
}

const SAMPLE_THREAD: Bubble[] = [
  {
    typingFor: 700,
    chunk: { label: 'Key Takeaway - Day 2', className: 'Learning Systems' },
    text: '- STEREOCENTERS: a carbon with four different groups attached\n- That one feature is what makes a molecule chiral: impossible to superimpose on its own mirror image',
  },
  { text: 'wait so diastereomers arent mirror images?', outgoing: true },
  {
    typingFor: 1100,
    text: "Right - enantiomers are the mirror images. Diastereomers differ at some stereocenters but not all, so their melting points and solubility actually differ. That's the bit the quiz will go after.",
  },
  { text: 'ok that finally clicked', outgoing: true },
  {
    typingFor: 700,
    text: "Nice. That's 4 days in a row - I'll send Thursday's before class.",
  },
];

interface Props {
  caption?: string;
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

export function IMessagePreview({ caption, assistantName = 'Paly', delay = 0 }: Props) {
  const { colors } = useTheme();
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
        timers.push(setTimeout(() => playFrom(index + 1), message.outgoing ? 700 : 1500));
      };

      if (message.typingFor) {
        setTyping(true);
        timers.push(setTimeout(reveal, message.typingFor));
      } else {
        timers.push(setTimeout(reveal, 350));
      }
    };

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
      <View style={styles.phone}>
        <View style={styles.screen}>
          <View style={styles.notch} />

          <View style={styles.threadHeader}>
            <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
              <Text style={styles.avatarText}>{assistantName.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.contactName}>{assistantName}</Text>
            <Text style={styles.contactChevron}>›</Text>
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
                    bubble.outgoing ? styles.outgoingBubble : styles.incomingBubble,
                  ]}
                >
                  {bubble.chunk ? (
                    <>
                      <Text style={[typography.labelSmall, { color: colors.accent }]}>
                        {bubble.chunk.label.toUpperCase()}
                      </Text>
                      <Text style={[typography.labelSmall, styles.className]}>
                        {bubble.chunk.className}
                      </Text>
                    </>
                  ) : null}
                  <Text
                    style={[
                      typography.bodySmall,
                      { color: bubble.outgoing ? '#FFFFFF' : '#111111' },
                    ]}
                  >
                    {bubble.text}
                  </Text>
                </Animated.View>
              );
            })}

            {typing ? (
              <Animated.View
                entering={FadeInUp.duration(220)}
                style={[styles.bubble, styles.typingBubble]}
              >
                <TypingDots color="#8E8E93" />
              </Animated.View>
            ) : null}
          </ScrollView>
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
    width: '88%',
    maxWidth: 300,
    alignSelf: 'center',
    // Drawn rather than a stretched PNG: the image had transparent margins, so
    // the shell colour behind it showed as a white box, and its 2070x4040
    // aspect ratio made the phone taller than the screen and clipped it.
    backgroundColor: '#1C1C1E',
    borderRadius: 40,
    padding: 9,
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  screen: {
    overflow: 'hidden',
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
  },
  notch: {
    width: 82,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#1C1C1E',
    alignSelf: 'center',
    marginTop: 7,
    marginBottom: 3,
    zIndex: 2,
  },
  threadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minHeight: 52,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D1D1D6',
    backgroundColor: '#F7F7F8',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  contactName: {
    color: '#111111',
    fontSize: 13,
    fontWeight: '600',
  },
  contactChevron: {
    color: '#8E8E93',
    fontSize: 18,
    lineHeight: 18,
  },
  threadScroll: {
    height: 300,
  },
  thread: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  bubble: {
    maxWidth: '88%',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 16,
  },
  outgoingBubble: {
    backgroundColor: IMESSAGE_BLUE,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  incomingBubble: {
    backgroundColor: '#E9E9EB',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  className: {
    color: '#6E6E73',
    marginBottom: SPACING.xs,
  },
  typingBubble: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    paddingVertical: SPACING.md,
    backgroundColor: '#E9E9EB',
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
