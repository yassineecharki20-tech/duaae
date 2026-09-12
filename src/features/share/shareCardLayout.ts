/**
 * DUAA — Share card layout, shared by every renderer.
 *
 * The web renderer draws this on a <canvas>; the native renderer renders the
 * same numbers as a real React Native view and rasterises it with view-shot.
 * Keeping the geometry here means both outputs are pixel-identical in spirit.
 */

import { wrapText } from '@/core/utils/arabic';
import type { Dua } from '@/core/types/domain';
// Deep import on purpose: this module is pure (it is unit-tested in the Node
// jest project), and the tokens barrel pulls in react-native for platform
// typography. `tokens/shareCard` only depends on the raw palette.
import { shareCardPalettes, type ShareCardPalette } from '@/design/tokens/shareCard';

export const CARD_WIDTH = 1080;
const FRAME_INSET = 56;

/** Font-size ladder, largest first. We pick the biggest size that fits. */
const FONT_LADDER = [50, 46, 42, 38, 34, 30, 27] as const;
/** Characters per line heuristic per size (Arabic averages wider than Latin). */
function charsForLine(fontSize: number): number {
  return Math.floor((CARD_WIDTH - FRAME_INSET * 2 - 96) / (fontSize * 0.52));
}

const MAX_TEXT_HEIGHT = 820;
const HEADER_HEIGHT = 430;
const FOOTER_HEIGHT = 230;
const MIN_CARD_HEIGHT = 1350;

/**
 * Card colours come from the design tokens (`@/design/tokens/shareCard`) — the
 * renderer receives a resolved palette, so no hex value is defined here.
 */
export type CardPalette = ShareCardPalette;

export const CARD_PALETTES: Record<'light' | 'dark', CardPalette> = shareCardPalettes;

export interface ShareCardLayout {
  width: number;
  height: number;
  palette: CardPalette;
  /** Wrapped scripture lines. */
  lines: string[];
  fontSize: number;
  lineHeight: number;
  /** Y of the first text baseline area (top of the text block). */
  textTop: number;
  textHeight: number;
  /** Y of the source chip block. */
  footerTop: number;
  /** Crescent geometry for the renderer to draw. */
  mark: { cx: number; cy: number; r: number };
  frameInset: number;
}

export interface ComputeOptions {
  scheme?: 'light' | 'dark';
}

/**
 * Deterministic layout: same input -> same card, on every platform.
 */
export function computeShareCardLayout(dua: Dua, options: ComputeOptions = {}): ShareCardLayout {
  const scheme = options.scheme ?? 'light';
  const palette = CARD_PALETTES[scheme];
  const text = (dua.text ?? '').replace(/\n/g, ' ');

  let fontSize = FONT_LADDER[FONT_LADDER.length - 1];
  let lines: string[] = wrapText(text, charsForLine(fontSize));

  for (const candidate of FONT_LADDER) {
    const candidateLines = wrapText(text, charsForLine(candidate));
    const candidateHeight = candidateLines.length * Math.round(candidate * 1.95);
    if (candidateHeight <= MAX_TEXT_HEIGHT) {
      fontSize = candidate;
      lines = candidateLines;
      break;
    }
  }

  const lineHeight = Math.round(fontSize * 1.95);
  const textHeight = lines.length * lineHeight;
  const textTop = HEADER_HEIGHT + 24;
  const naturalFooter = textTop + textHeight + 56;
  const height = Math.max(MIN_CARD_HEIGHT, naturalFooter + FOOTER_HEIGHT);
  // Pin the footer near the bottom edge so short duas still look composed.
  const footerTop = Math.max(naturalFooter, height - FOOTER_HEIGHT + 60);

  return {
    width: CARD_WIDTH,
    height,
    palette,
    lines,
    fontSize,
    lineHeight,
    textTop,
    textHeight,
    footerTop,
    mark: { cx: CARD_WIDTH / 2, cy: 168, r: 44 },
    frameInset: FRAME_INSET,
  };
}
