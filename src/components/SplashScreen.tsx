import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { THEME_COLORS } from '../theme/colors';

interface SplashScreenProps {
  onAnimationComplete?: () => void;
  accentColor?: string;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onAnimationComplete, accentColor }) => {
  const { width, height } = useWindowDimensions();
  const decorationSize = Math.min(Math.max(width, 320), 900);
  // Use provided accent color or default to Indigo
  const themeColor = accentColor
    ? THEME_COLORS.find((c) => c.value === accentColor) || THEME_COLORS[0]
    : THEME_COLORS[0];

  // Animation values
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(20)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const ringScale1 = useRef(new Animated.Value(0.8)).current;
  const ringOpacity1 = useRef(new Animated.Value(0)).current;
  const ringScale2 = useRef(new Animated.Value(0.8)).current;
  const ringOpacity2 = useRef(new Animated.Value(0)).current;
  const ringScale3 = useRef(new Animated.Value(0.8)).current;
  const ringOpacity3 = useRef(new Animated.Value(0)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Staggered animation sequence
    Animated.sequence([
      // Phase 1: Logo appears with scale
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      // Phase 2: Rings expand outward
      Animated.stagger(150, [
        Animated.parallel([
          Animated.timing(ringScale1, {
            toValue: 1.5,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(ringOpacity1, {
              toValue: 0.4,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(ringOpacity1, {
              toValue: 0,
              duration: 600,
              useNativeDriver: true,
            }),
          ]),
        ]),
        Animated.parallel([
          Animated.timing(ringScale2, {
            toValue: 1.8,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(ringOpacity2, {
              toValue: 0.3,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(ringOpacity2, {
              toValue: 0,
              duration: 600,
              useNativeDriver: true,
            }),
          ]),
        ]),
        Animated.parallel([
          Animated.timing(ringScale3, {
            toValue: 2.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(ringOpacity3, {
              toValue: 0.2,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(ringOpacity3, {
              toValue: 0,
              duration: 600,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]),
      // Phase 3: Text appears
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(textTranslateY, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      // Phase 4: Subtitle
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      // Hold for a moment
      Animated.delay(600),
      // Phase 5: Fade out everything
      Animated.timing(fadeOut, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onAnimationComplete?.();
    });
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: fadeOut }]}>
      <LinearGradient
        colors={[themeColor.value, themeColor.deepDark]}
        style={styles.gradient}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
      >
        {/* Decorative background elements */}
        <View style={styles.backgroundDecoration}>
          <View
            style={[
              styles.bgCircle,
              {
                width: decorationSize * 1.5,
                height: decorationSize * 1.5,
                top: -decorationSize * 0.5,
                right: -decorationSize * 0.5,
              },
              { backgroundColor: themeColor.light + '10' },
            ]}
          />
          <View
            style={[
              styles.bgCircle,
              {
                width: decorationSize * 1.2,
                height: decorationSize * 1.2,
                bottom: -decorationSize * 0.3,
                left: -decorationSize * 0.4,
              },
              { backgroundColor: themeColor.light + '08' },
            ]}
          />
          <View
            style={[
              styles.bgCircle,
              {
                width: decorationSize * 0.8,
                height: decorationSize * 0.8,
                top: height * 0.4,
                right: -decorationSize * 0.2,
              },
              { backgroundColor: themeColor.light + '05' },
            ]}
          />
        </View>

        {/* Main content */}
        <View style={styles.content}>
          {/* Animated rings */}
          <View style={styles.ringContainer}>
            <Animated.View
              style={[
                styles.ring,
                {
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  opacity: ringOpacity1,
                  transform: [{ scale: ringScale1 }],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.ring,
                {
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  opacity: ringOpacity2,
                  transform: [{ scale: ringScale2 }],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.ring,
                {
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  opacity: ringOpacity3,
                  transform: [{ scale: ringScale3 }],
                },
              ]}
            />
          </View>

          {/* Logo */}
          <Animated.View
            style={[
              styles.logoContainer,
              {
                opacity: logoOpacity,
                transform: [{ scale: logoScale }],
              },
            ]}
          >
            <View style={styles.logoInner}>
              <Ionicons name="school" size={48} color={themeColor.value} />
            </View>
          </Animated.View>

          {/* App name */}
          <Animated.View
            style={[
              styles.textContainer,
              {
                opacity: textOpacity,
                transform: [{ translateY: textTranslateY }],
              },
            ]}
          >
            <Text style={styles.appName}>Paly</Text>
          </Animated.View>

          {/* Subtitle */}
          <Animated.View style={{ opacity: subtitleOpacity }}>
            <Text style={styles.subtitle}>Your Study Companion</Text>
          </Animated.View>
        </View>

        {/* Bottom decoration */}
        <View style={styles.bottomDecoration}>
          <View style={[styles.bottomLine, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]} />
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundDecoration: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  bgCircle: {
    position: 'absolute',
    borderRadius: 9999,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoInner: {
    width: 100,
    height: 100,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
      web: {
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
      },
    }),
  },
  textContainer: {
    alignItems: 'center',
  },
  appName: {
    fontSize: 52,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -1,
    ...Platform.select({
      web: {
        textShadow: '0 2px 12px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 8,
    letterSpacing: 0.5,
  },
  bottomDecoration: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
  },
  bottomLine: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
});

export default SplashScreen;
