import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import {
  getDerivedColors,
  getRandomThemeColor,
  THEME_COLORS,
  SURFACE_COLORS,
  TEXT_ON_ACCENT,
  TEXT_ON_CARD,
  SEMANTIC_COLORS,
} from './colors';

type ColorScheme = 'light' | 'dark';

interface ThemeColors {
  // Main backgrounds (ACCENT-FIRST - your chosen color!)
  background: string; // Main accent color (middle of screen)
  backgroundSecondary: string; // Slightly different shade
  backgroundTertiary: string; // Darker shade for vignette/edges
  backgroundDeep: string; // Deepest accent shade

  // Cards & surfaces (white/neutral - the accents!)
  card: string;
  cardSecondary: string;
  cardTertiary: string;

  // Borders
  border: string;
  borderStrong: string;

  // Text on accent backgrounds (light text)
  text: string;
  textSecondary: string;
  textTertiary: string;
  textMuted: string;

  // Text on cards (ALWAYS dark text for visibility on white cards)
  cardText: string;
  cardTextSecondary: string;
  cardTextTertiary: string;
  cardTextMuted: string;

  // The brand colors (your chosen color)
  accent: string;
  accentLight: string;
  accentDark: string;

  // Elements that need to be white on colored background
  white: string;
  whiteAlpha: string;

  /**
   * Glyphs sitting on `card` when that card is a chip on the accent page.
   * White in dark mode — using `background` here is how icons went maroon-on-maroon.
   */
  onCard: string;

  // Semantic
  success: string;
  warning: string;
  error: string;
  info: string;

  // Glass
  glassBackground: string;
  glassBorder: string;
  glassShadow: string;
}

interface ThemeContextType {
  colors: ThemeColors;
  colorScheme: ColorScheme;
  accentColor: string;
  setAccentColor: (color: string) => void;
  toggleColorScheme: () => void;
  availableColors: typeof THEME_COLORS;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  initialAccentColor?: string;
}

export function ThemeProvider({ children, initialAccentColor }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const [colorScheme, setColorScheme] = useState<ColorScheme>(systemColorScheme || 'light');
  const [accentColor, setAccentColor] = useState(initialAccentColor || getRandomThemeColor().value);

  useEffect(() => {
    if (systemColorScheme) {
      setColorScheme(systemColorScheme);
    }
  }, [systemColorScheme]);

  useEffect(() => {
    if (initialAccentColor && THEME_COLORS.some((color) => color.value === initialAccentColor)) {
      setAccentColor(initialAccentColor);
    }
  }, [initialAccentColor]);

  const colors = useMemo((): ThemeColors => {
    const isDark = colorScheme === 'dark';
    const derived = getDerivedColors(accentColor);
    const surfaces = isDark ? SURFACE_COLORS.dark : SURFACE_COLORS.light;

    return {
      // Main backgrounds - YOUR ACCENT COLOR IS THE STAR!
      // Use the deepest shade for text-bearing backgrounds and controls. Every
      // theme in the palette keeps at least readable contrast with white text;
      // several of the brighter swatch colors do not.
      background: derived.accentDeepDark,
      backgroundSecondary: derived.accentDeepDark,
      backgroundTertiary: derived.accentDeepDark,
      backgroundDeep: derived.accentDeepDark,

      // Cards & surfaces - neutral/white
      card: surfaces.card,
      cardSecondary: surfaces.cardSecondary,
      cardTertiary: surfaces.cardTertiary,

      // Borders
      border: surfaces.border,
      borderStrong: surfaces.borderStrong,

      // Text on accent backgrounds (light text)
      text: TEXT_ON_ACCENT.primary,
      textSecondary: TEXT_ON_ACCENT.secondary,
      textTertiary: TEXT_ON_ACCENT.tertiary,
      textMuted: TEXT_ON_ACCENT.muted,

      // Text on cards (dark in light mode, light in dark mode)
      cardText: isDark ? TEXT_ON_ACCENT.primary : TEXT_ON_CARD.primary,
      cardTextSecondary: isDark ? TEXT_ON_ACCENT.secondary : TEXT_ON_CARD.secondary,
      cardTextTertiary: isDark ? TEXT_ON_ACCENT.tertiary : TEXT_ON_CARD.tertiary,
      cardTextMuted: isDark ? TEXT_ON_ACCENT.muted : TEXT_ON_CARD.muted,

      // The brand colors
      accent: derived.accentDeepDark,
      accentLight: derived.accentLight,
      accentDark: derived.accentDeepDark,

      // Elements that need to be white
      white: '#FFFFFF',
      whiteAlpha: 'rgba(255, 255, 255, 0.2)',
      onCard: isDark ? '#FFFFFF' : derived.accent,

      // Semantic
      success: SEMANTIC_COLORS.success,
      warning: SEMANTIC_COLORS.warning,
      error: SEMANTIC_COLORS.error,
      info: SEMANTIC_COLORS.info,

      // Glass
      glassBackground: 'rgba(255, 255, 255, 0.15)',
      glassBorder: 'rgba(255, 255, 255, 0.25)',
      glassShadow: 'rgba(0, 0, 0, 0.15)',
    };
  }, [colorScheme, accentColor]);

  const toggleColorScheme = () => {
    setColorScheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider
      value={{
        colors,
        colorScheme,
        accentColor,
        setAccentColor,
        toggleColorScheme,
        availableColors: THEME_COLORS,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
