import React from 'react';
import { View, StyleSheet, Platform, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';

interface BackgroundProps {
  children?: React.ReactNode;
}

export function Background({ children }: BackgroundProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 
        Web-specific: Real radial gradient for that perfect elliptical look
      */}
      {Platform.OS === 'web' && (
        <View
          style={[
            StyleSheet.absoluteFill,
            // Web-only CSS properties that have no React Native style equivalent.
            {
              background: `radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,0.3) 100%)`,
              pointerEvents: 'none',
            } as unknown as ViewStyle,
          ]}
        />
      )}

      {/* 
        Native: Simulation of an ellipse using overlapping soft gradients
      */}
      {Platform.OS !== 'web' && (
        <>
          {/* Main vertical vignette - thicker edges */}
          <LinearGradient
            colors={['rgba(0,0,0,0.25)', 'transparent', 'transparent', 'rgba(0,0,0,0.3)']}
            locations={[0, 0.25, 0.75, 1]}
            style={StyleSheet.absoluteFill}
          />

          {/* Main horizontal vignette - thicker edges */}
          <LinearGradient
            colors={['rgba(0,0,0,0.2)', 'transparent', 'transparent', 'rgba(0,0,0,0.2)']}
            locations={[0, 0.2, 0.8, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />

          {/* Corner rounding gradients to break the rectangular feel */}
          {/* Top Left */}
          <LinearGradient
            colors={['rgba(0,0,0,0.15)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.4, y: 0.4 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Top Right */}
          <LinearGradient
            colors={['rgba(0,0,0,0.15)', 'transparent']}
            start={{ x: 1, y: 0 }}
            end={{ x: 0.6, y: 0.4 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Bottom Left */}
          <LinearGradient
            colors={['rgba(0,0,0,0.15)', 'transparent']}
            start={{ x: 0, y: 1 }}
            end={{ x: 0.4, y: 0.6 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Bottom Right */}
          <LinearGradient
            colors={['rgba(0,0,0,0.15)', 'transparent']}
            start={{ x: 1, y: 1 }}
            end={{ x: 0.6, y: 0.6 }}
            style={StyleSheet.absoluteFill}
          />
        </>
      )}

      {/* Subtle Sheen for texture */}
      <LinearGradient
        colors={['rgba(255,255,255,0.08)', 'transparent', 'rgba(0,0,0,0.05)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Web Texture */}
      {Platform.OS === 'web' && (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              opacity: 0.03,
              backgroundImage:
                'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")',
              pointerEvents: 'none',
            },
          ]}
        />
      )}

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
});
