import { TextStyle } from 'react-native';

// Editorial typography scale
// Large, confident headlines paired with refined body text

export const FONT_FAMILIES = {
  // Display/Headlines - Confident, editorial
  display: 'System', // Will be replaced with custom font
  // Body - Highly readable
  body: 'System',
  // Mono - For code/data
  mono: 'System',
} as const;

export const FONT_SIZES = {
  // Display sizes
  displayLarge: 48,
  displayMedium: 40,
  displaySmall: 32,

  // Headline sizes
  headlineLarge: 28,
  headlineMedium: 24,
  headlineSmall: 20,

  // Title sizes
  titleLarge: 18,
  titleMedium: 16,
  titleSmall: 14,

  // Body sizes
  bodyLarge: 16,
  bodyMedium: 14,
  bodySmall: 13,

  // Label sizes
  labelLarge: 14,
  labelMedium: 13,
  labelSmall: 11,
} as const;

export const LINE_HEIGHTS = {
  tight: 1.1,
  normal: 1.4,
  relaxed: 1.6,
  loose: 1.8,
} as const;

export const FONT_WEIGHTS = {
  light: '300' as const,
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
} as const;

export const LETTER_SPACING = {
  tight: -0.5,
  normal: 0,
  wide: 0.5,
  wider: 1,
} as const;

// Pre-composed text styles
export const typography: Record<string, TextStyle> = {
  // Display styles - for hero sections
  displayLarge: {
    fontSize: FONT_SIZES.displayLarge,
    fontWeight: FONT_WEIGHTS.bold,
    lineHeight: FONT_SIZES.displayLarge * LINE_HEIGHTS.tight,
    letterSpacing: LETTER_SPACING.tight,
  },
  displayMedium: {
    fontSize: FONT_SIZES.displayMedium,
    fontWeight: FONT_WEIGHTS.bold,
    lineHeight: FONT_SIZES.displayMedium * LINE_HEIGHTS.tight,
    letterSpacing: LETTER_SPACING.tight,
  },
  displaySmall: {
    fontSize: FONT_SIZES.displaySmall,
    fontWeight: FONT_WEIGHTS.bold,
    lineHeight: FONT_SIZES.displaySmall * LINE_HEIGHTS.tight,
    letterSpacing: LETTER_SPACING.tight,
  },

  // Headlines - for section titles
  headlineLarge: {
    fontSize: FONT_SIZES.headlineLarge,
    fontWeight: FONT_WEIGHTS.semibold,
    lineHeight: FONT_SIZES.headlineLarge * LINE_HEIGHTS.normal,
    letterSpacing: LETTER_SPACING.normal,
  },
  headlineMedium: {
    fontSize: FONT_SIZES.headlineMedium,
    fontWeight: FONT_WEIGHTS.semibold,
    lineHeight: FONT_SIZES.headlineMedium * LINE_HEIGHTS.normal,
    letterSpacing: LETTER_SPACING.normal,
  },
  headlineSmall: {
    fontSize: FONT_SIZES.headlineSmall,
    fontWeight: FONT_WEIGHTS.semibold,
    lineHeight: FONT_SIZES.headlineSmall * LINE_HEIGHTS.normal,
    letterSpacing: LETTER_SPACING.normal,
  },

  // Titles - for cards, list items
  titleLarge: {
    fontSize: FONT_SIZES.titleLarge,
    fontWeight: FONT_WEIGHTS.medium,
    lineHeight: FONT_SIZES.titleLarge * LINE_HEIGHTS.normal,
    letterSpacing: LETTER_SPACING.normal,
  },
  titleMedium: {
    fontSize: FONT_SIZES.titleMedium,
    fontWeight: FONT_WEIGHTS.medium,
    lineHeight: FONT_SIZES.titleMedium * LINE_HEIGHTS.normal,
    letterSpacing: LETTER_SPACING.normal,
  },
  titleSmall: {
    fontSize: FONT_SIZES.titleSmall,
    fontWeight: FONT_WEIGHTS.medium,
    lineHeight: FONT_SIZES.titleSmall * LINE_HEIGHTS.normal,
    letterSpacing: LETTER_SPACING.normal,
  },

  // Body - for paragraphs, content
  bodyLarge: {
    fontSize: FONT_SIZES.bodyLarge,
    fontWeight: FONT_WEIGHTS.regular,
    lineHeight: FONT_SIZES.bodyLarge * LINE_HEIGHTS.relaxed,
    letterSpacing: LETTER_SPACING.normal,
  },
  bodyMedium: {
    fontSize: FONT_SIZES.bodyMedium,
    fontWeight: FONT_WEIGHTS.regular,
    lineHeight: FONT_SIZES.bodyMedium * LINE_HEIGHTS.relaxed,
    letterSpacing: LETTER_SPACING.normal,
  },
  bodySmall: {
    fontSize: FONT_SIZES.bodySmall,
    fontWeight: FONT_WEIGHTS.regular,
    lineHeight: FONT_SIZES.bodySmall * LINE_HEIGHTS.relaxed,
    letterSpacing: LETTER_SPACING.normal,
  },

  // Labels - for buttons, tags, captions
  labelLarge: {
    fontSize: FONT_SIZES.labelLarge,
    fontWeight: FONT_WEIGHTS.medium,
    lineHeight: FONT_SIZES.labelLarge * LINE_HEIGHTS.normal,
    letterSpacing: LETTER_SPACING.wide,
  },
  labelMedium: {
    fontSize: FONT_SIZES.labelMedium,
    fontWeight: FONT_WEIGHTS.medium,
    lineHeight: FONT_SIZES.labelMedium * LINE_HEIGHTS.normal,
    letterSpacing: LETTER_SPACING.wide,
  },
  labelSmall: {
    fontSize: FONT_SIZES.labelSmall,
    fontWeight: FONT_WEIGHTS.medium,
    lineHeight: FONT_SIZES.labelSmall * LINE_HEIGHTS.normal,
    letterSpacing: LETTER_SPACING.wider,
    textTransform: 'uppercase',
  },
};
