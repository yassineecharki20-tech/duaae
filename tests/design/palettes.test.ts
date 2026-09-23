/**
 * Design tokens — palettes, accents and contrast.
 *
 * Personalization offers 8 palettes × 8 accents × light/dark. Only the default
 * pair is hand-tuned; everything else is derived in `colorMath.ts` /
 * `palettes.ts`. This suite is the guarantee that a user who picks "Rose" or
 * "Sapphire" never ends up with unreadable text: every text/background pair that
 * the app actually renders is asserted against WCAG AA (4.5:1 for body text,
 * 3:1 for large text and non-text UI), in both schemes, for every combination.
 */

import {
  contrastRatio,
  ensureContrast,
  hexToRgb,
  lighten,
  darken,
  mix,
  mute,
  relativeLuminance,
  rgbToHex,
  withAlpha,
} from '@/design/tokens/colorMath';
import {
  ACCENT_SEEDS,
  PALETTE_SEEDS,
  accentSwatch,
  applyAccent,
  applyHighReadability,
  paletteSwatch,
  resolveColorTokens,
} from '@/design/tokens/palettes';
import { darkColors, lightColors, type ColorTokens } from '@/design/tokens/themeColors';
import {
  ACCENT_COLOR_IDS,
  THEME_PALETTE_IDS,
  type AccentColorId,
  type ThemePaletteId,
} from '@/core/types/domain';

const AA_TEXT = 4.5;
const AA_LARGE = 3;
/**
 * Two thresholds sit below AA on purpose, and both are documented rather than
 * silently relaxed:
 *
 * • `DECORATIVE_GRAPHIC` (2.5) — the accent hue as an icon or underline. It never
 *   carries information alone: every accent glyph sits next to a text label, and
 *   text *on* the accent is held to AA (`onAccent`).
 * • `DECORATIVE_BORDER` (1.2) — hairline card borders. Cards are separated by a
 *   background change plus an elevation shadow, so the border is not the only
 *   boundary cue (WCAG 1.4.11 exempts non-essential decoration).
 */
const DECORATIVE_GRAPHIC = 2.5;
const DECORATIVE_BORDER = 1.2;

/** Pairs the UI really renders text on. [foreground, background, minimum ratio] */
const TEXT_PAIRS: readonly [keyof ColorTokens, keyof ColorTokens, number][] = [
  ['text', 'background', AA_TEXT],
  ['text', 'surface', AA_TEXT],
  ['text', 'surfaceMuted', AA_TEXT],
  ['textMuted', 'background', AA_TEXT],
  ['textSubtle', 'background', AA_TEXT],
  ['textSubtle', 'surface', AA_TEXT],
  ['textScripture', 'surface', AA_TEXT],
  ['textLink', 'background', AA_TEXT],
  ['onSurface', 'surface', AA_TEXT],
  ['onSurfaceMuted', 'surfaceMuted', AA_TEXT],
  ['onPrimary', 'primary', AA_TEXT],
  ['onPrimaryContainer', 'primaryContainer', AA_TEXT],
  ['onAccent', 'accent', AA_TEXT],
  ['onAccentContainer', 'accentContainer', AA_TEXT],
  ['onErrorContainer', 'errorContainer', AA_TEXT],
  ['onSecondary', 'secondary', AA_TEXT],
];

/**
 * Non-text contrast: icons, borders and tab glyphs against what sits behind them.
 * `tabBar` is translucent (`rgba`), so the tab glyphs are measured against the
 * opaque `background` they effectively sit on.
 */
const UI_PAIRS: readonly [keyof ColorTokens, keyof ColorTokens, number][] = [
  ['primary', 'background', AA_LARGE],
  ['accent', 'background', DECORATIVE_GRAPHIC],
  ['border', 'surface', DECORATIVE_BORDER],
  ['tabActive', 'background', AA_LARGE],
  ['tabInactive', 'background', AA_LARGE],
];

const SCHEMES = ['light', 'dark'] as const;

function tokens(
  palette: ThemePaletteId,
  accent: AccentColorId,
  scheme: (typeof SCHEMES)[number],
  highReadability = false,
): ColorTokens {
  return resolveColorTokens(palette, accent, scheme, highReadability);
}

function failures(
  colors: ColorTokens,
  pairs: readonly [keyof ColorTokens, keyof ColorTokens, number][],
): string[] {
  const out: string[] = [];
  for (const [fg, bg, min] of pairs) {
    const ratio = contrastRatio(String(colors[fg]), String(colors[bg]));
    if (ratio < min) {
      out.push(`${String(fg)} on ${String(bg)} = ${ratio.toFixed(2)} (< ${min})`);
    }
  }
  return out;
}

describe('colour maths', () => {
  it('round-trips hex ↔ rgb', () => {
    for (const hex of ['#0B5C41', '#F9F6EE', '#CBA754', '#0A1512', '#ffffff', '#000000']) {
      expect(rgbToHex(hexToRgb(hex)).toLowerCase()).toBe(hex.toLowerCase());
    }
  });

  it('computes the textbook contrast ratios', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5);
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
  });

  it('nudges a colour until it reaches the target, and never overshoots into noise', () => {
    const fixed = ensureContrast('#9a9a9a', '#ffffff', AA_TEXT);
    expect(contrastRatio(fixed, '#ffffff')).toBeGreaterThanOrEqual(AA_TEXT);
    // Already-compliant colours are returned untouched.
    expect(ensureContrast('#000000', '#ffffff', AA_TEXT)).toBe('#000000');
    // White text on a mid-tone accent cannot reach AA by getting lighter, so the
    // nudge reverses direction instead of giving up (real case: gold accent).
    const onGold = ensureContrast('#FFFFFF', '#B98F35', AA_TEXT);
    expect(contrastRatio(onGold, '#B98F35')).toBeGreaterThanOrEqual(AA_TEXT);
    expect(onGold.toLowerCase()).not.toBe('#ffffff');
  });

  it('mixes, lightens, darkens, mutes and adds alpha predictably', () => {
    expect(mix('#000000', '#ffffff', 0.5).toLowerCase()).toBe('#808080');
    expect(lighten('#000000', 1).toLowerCase()).toBe('#ffffff');
    expect(darken('#ffffff', 1).toLowerCase()).toBe('#000000');
    expect(withAlpha('#0b5c41', 0.5)).toBe('rgba(11,92,65,0.5)');
    expect(mute('#0b5c41', 0.35)).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

describe('shipped design', () => {
  it('returns the literal hand-tuned tokens for the default palette + gold accent', () => {
    expect(tokens('default', 'gold', 'light')).toBe(lightColors);
    expect(tokens('default', 'gold', 'dark')).toBe(darkColors);
  });

  it('keeps the shipped design readable in both schemes', () => {
    for (const scheme of SCHEMES) {
      const colors = tokens('default', 'gold', scheme);
      expect({ scheme, text: failures(colors, TEXT_PAIRS) }).toEqual({ scheme, text: [] });
      expect({ scheme, ui: failures(colors, UI_PAIRS) }).toEqual({ scheme, ui: [] });
    }
  });
});

describe('every personalized combination', () => {
  it('has a seed for each palette and accent the settings screen offers', () => {
    expect(Object.keys(PALETTE_SEEDS).sort()).toEqual([...THEME_PALETTE_IDS].sort());
    expect(Object.keys(ACCENT_SEEDS).sort()).toEqual([...ACCENT_COLOR_IDS].sort());
  });

  it.each([...THEME_PALETTE_IDS])('palette "%s" passes AA text contrast in both schemes', (palette) => {
    for (const accent of ACCENT_COLOR_IDS) {
      for (const scheme of SCHEMES) {
        const colors = tokens(palette, accent, scheme);
        expect({ palette, accent, scheme, bad: failures(colors, TEXT_PAIRS) }).toEqual({
          palette,
          accent,
          scheme,
          bad: [],
        });
      }
    }
  });

  it.each([...THEME_PALETTE_IDS])('palette "%s" keeps icons and borders distinguishable', (palette) => {
    for (const accent of ACCENT_COLOR_IDS) {
      for (const scheme of SCHEMES) {
        const colors = tokens(palette, accent, scheme);
        expect({ palette, accent, scheme, bad: failures(colors, UI_PAIRS) }).toEqual({
          palette,
          accent,
          scheme,
          bad: [],
        });
      }
    }
  });

  it('high readability raises body text to AAA and never breaks a pair', () => {
    for (const palette of THEME_PALETTE_IDS) {
      for (const scheme of SCHEMES) {
        const normal = tokens(palette, 'gold', scheme);
        const boosted = tokens(palette, 'gold', scheme, true);

        expect(contrastRatio(boosted.text, boosted.background)).toBeGreaterThanOrEqual(7);
        expect(contrastRatio(boosted.textScripture, boosted.surface)).toBeGreaterThanOrEqual(7);
        expect(contrastRatio(boosted.text, boosted.background)).toBeGreaterThanOrEqual(
          contrastRatio(normal.text, normal.background),
        );
        expect(failures(boosted, TEXT_PAIRS)).toEqual([]);
        expect(failures(boosted, UI_PAIRS)).toEqual([]);
      }
    }
  });

  it('changing the accent really changes the accent family, and stays readable', () => {
    const accents = ACCENT_COLOR_IDS.map((accent) => tokens('default', accent, 'light').accent);
    expect(new Set(accents).size).toBe(accents.length);

    for (const accent of ACCENT_COLOR_IDS) {
      for (const scheme of SCHEMES) {
        const colors = applyAccent(scheme === 'dark' ? darkColors : lightColors, accent, scheme);
        expect(contrastRatio(colors.onAccent, colors.accent)).toBeGreaterThanOrEqual(AA_TEXT);
        expect(contrastRatio(colors.onAccentContainer, colors.accentContainer)).toBeGreaterThanOrEqual(AA_TEXT);
      }
    }
  });

  it('renders the subtle tone readably in the shipped design', () => {
    // Regression guard: `textSubtle` carries source lines and metadata, so it is
    // held to AA like any other text — in both schemes, on both backdrops.
    for (const colors of [lightColors, darkColors]) {
      expect(contrastRatio(colors.textSubtle, colors.background)).toBeGreaterThanOrEqual(AA_TEXT);
      expect(contrastRatio(colors.textSubtle, colors.surface)).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });

  it('exposes swatches as hex colours for the pickers', () => {
    for (const palette of THEME_PALETTE_IDS) {
      for (const scheme of SCHEMES) {
        expect(paletteSwatch(palette, scheme)).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
    for (const accent of ACCENT_COLOR_IDS) {
      for (const scheme of SCHEMES) {
        expect(accentSwatch(accent, scheme)).toMatch(/^#[0-9a-f]{6,8}$/i);
      }
    }
  });

  it('falls back to the default seed for an unknown id instead of crashing', () => {
    const unknownPalette = tokens('nope' as ThemePaletteId, 'gold', 'light');
    expect(unknownPalette.background).toMatch(/^#/);
    const unknownAccent = applyAccent(lightColors, 'nope' as AccentColorId, 'light');
    expect(unknownAccent.accent).toMatch(/^#/);
    expect(applyHighReadability(lightColors, 'light').text).toMatch(/^#/);
  });
});
