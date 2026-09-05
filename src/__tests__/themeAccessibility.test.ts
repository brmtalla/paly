import { THEME_COLORS } from '../theme/colors';
import { FONT_SIZES } from '../theme/typography';
import { LAYOUT } from '../theme/spacing';

function relativeLuminance(hex: string) {
  const channels = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
  const [red, green, blue] = channels.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  );

  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

function contrastRatio(first: string, second: string) {
  const lighter = Math.max(relativeLuminance(first), relativeLuminance(second));
  const darker = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (lighter + 0.05) / (darker + 0.05);
}

describe('interface accessibility constants', () => {
  it.each(THEME_COLORS)('$name text-bearing accent has readable white contrast', (theme) => {
    expect(contrastRatio(theme.deepDark, '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps the smallest supported text at least 11 points', () => {
    expect(Math.min(...Object.values(FONT_SIZES))).toBeGreaterThanOrEqual(11);
  });

  it('keeps shared controls at least 44 points', () => {
    expect(LAYOUT.minTouchTarget).toBeGreaterThanOrEqual(44);
  });
});
