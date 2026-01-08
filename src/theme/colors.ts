// Curated color palette for personalized theme assignment
// Each color is carefully selected for accessibility and aesthetic appeal

export const THEME_COLORS = [
  { name: 'Indigo', value: '#6366F1', light: '#818CF8', dark: '#4F46E5', deepDark: '#3730A3' },
  { name: 'Rose', value: '#F43F5E', light: '#FB7185', dark: '#E11D48', deepDark: '#BE123C' },
  { name: 'Amber', value: '#F59E0B', light: '#FBBF24', dark: '#D97706', deepDark: '#B45309' },
  { name: 'Emerald', value: '#10B981', light: '#34D399', dark: '#059669', deepDark: '#047857' },
  { name: 'Cyan', value: '#06B6D4', light: '#22D3EE', dark: '#0891B2', deepDark: '#0E7490' },
  { name: 'Violet', value: '#8B5CF6', light: '#A78BFA', dark: '#7C3AED', deepDark: '#6D28D9' },
  { name: 'Pink', value: '#EC4899', light: '#F472B6', dark: '#DB2777', deepDark: '#BE185D' },
  { name: 'Teal', value: '#14B8A6', light: '#2DD4BF', dark: '#0D9488', deepDark: '#0F766E' },
  { name: 'Orange', value: '#F97316', light: '#FB923C', dark: '#EA580C', deepDark: '#C2410C' },
  { name: 'Sky', value: '#0EA5E9', light: '#38BDF8', dark: '#0284C7', deepDark: '#0369A1' },
  { name: 'Lime', value: '#84CC16', light: '#A3E635', dark: '#65A30D', deepDark: '#4D7C0F' },
  { name: 'Fuchsia', value: '#D946EF', light: '#E879F9', dark: '#C026D3', deepDark: '#A21CAF' },
] as const;

export type ThemeColorName = typeof THEME_COLORS[number]['name'];

// Card and surface colors (neutral)
export const SURFACE_COLORS = {
  light: {
    card: '#FFFFFF',
    cardSecondary: '#F8F8F8',
    cardTertiary: '#F0F0F0',
    border: 'rgba(255, 255, 255, 0.25)',
    borderStrong: 'rgba(255, 255, 255, 0.4)',
  },
  dark: {
    card: 'rgba(255, 255, 255, 0.12)',
    cardSecondary: 'rgba(255, 255, 255, 0.08)',
    cardTertiary: 'rgba(255, 255, 255, 0.05)',
    border: 'rgba(255, 255, 255, 0.15)',
    borderStrong: 'rgba(255, 255, 255, 0.25)',
  },
} as const;

// Text colors for dark backgrounds (accent-first design)
export const TEXT_ON_ACCENT = {
  primary: '#FFFFFF',
  secondary: 'rgba(255, 255, 255, 0.85)',
  tertiary: 'rgba(255, 255, 255, 0.65)',
  muted: 'rgba(255, 255, 255, 0.45)',
} as const;

// Text colors for light cards
export const TEXT_ON_CARD = {
  primary: '#1A1A1A',
  secondary: '#4A4A4A',
  tertiary: '#7A7A7A',
  muted: '#A3A3A3',
} as const;

// Semantic colors
export const SEMANTIC_COLORS = {
  success: '#10B981',
  successLight: '#34D399',
  warning: '#F59E0B',
  warningLight: '#FBBF24',
  error: '#EF4444',
  errorLight: '#F87171',
  info: '#3B82F6',
  infoLight: '#60A5FA',
} as const;

// Get a random theme color for new users
export const getRandomThemeColor = () => {
  const randomIndex = Math.floor(Math.random() * THEME_COLORS.length);
  return THEME_COLORS[randomIndex];
};

// Get theme color object by value
export const getThemeColorByValue = (value: string) => {
  return THEME_COLORS.find(c => c.value === value) || THEME_COLORS[0];
};

// Generate all derived colors from accent for accent-first design
export const getDerivedColors = (accentColor: string) => {
  const themeColor = getThemeColorByValue(accentColor);
  return {
    accent: themeColor.value,
    accentLight: themeColor.light,
    accentDark: themeColor.dark,
    accentDeepDark: themeColor.deepDark,
  };
};

// Legacy BASE_COLORS for backward compatibility if needed
export const BASE_COLORS = {
  background: {
    primary: '#FAF9F7',
    secondary: '#F5F3EF',
    tertiary: '#EDE9E3',
    elevated: '#FFFFFF',
  },
  text: {
    primary: '#1A1A1A',
    secondary: '#4A4A4A',
    tertiary: '#7A7A7A',
    muted: '#A3A3A3',
    inverse: '#FFFFFF',
  },
  semantic: SEMANTIC_COLORS,
  glass: {
    background: 'rgba(255, 255, 255, 0.72)',
    border: 'rgba(255, 255, 255, 0.18)',
    shadow: 'rgba(0, 0, 0, 0.04)',
  },
  dark: {
    background: {
      primary: '#0F0F0F',
      secondary: '#1A1A1A',
      tertiary: '#262626',
      elevated: '#2A2A2A',
    },
    text: {
      primary: '#FAFAFA',
      secondary: '#D4D4D4',
      tertiary: '#A3A3A3',
      muted: '#737373',
      inverse: '#0F0F0F',
    },
    glass: {
      background: 'rgba(26, 26, 26, 0.72)',
      border: 'rgba(255, 255, 255, 0.08)',
      shadow: 'rgba(0, 0, 0, 0.2)',
    },
  },
} as const;
