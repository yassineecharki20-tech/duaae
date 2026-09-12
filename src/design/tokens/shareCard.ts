/**
 * DUAA — Share card palettes.
 *
 * Generated share images are rendered off-screen (Canvas 2D on web,
 * react-native-view-shot natively) and exported as PNG. The renderer cannot ask
 * the live theme for a colour mid-draw, so the two palettes are fixed here as
 * tokens — built from the same raw palette as everything else, never re-typed
 * as literals inside the feature code.
 *
 * Contrast is deliberately high because the image is read as a thumbnail in a
 * chat list: ivory/near-black ink in light mode, night/near-white in dark.
 */
import { gold, ink, ivory, night } from './colors';

export interface ShareCardPalette {
  background: string;
  ink: string;
  muted: string;
  gold: string;
  frame: string;
  chipBackground: string;
}

export const shareCardPalettes = {
  light: {
    background: ivory[100],
    ink: ink[800],
    muted: '#5C6B65',
    gold: gold[500],
    frame: '#E4D9BF',
    chipBackground: '#F1EBDC',
  },
  dark: {
    background: night[900],
    ink: '#F2F7F4',
    muted: '#9FB2AB',
    gold: gold[300],
    frame: night[600],
    chipBackground: night[750],
  },
} as const satisfies Record<'light' | 'dark', ShareCardPalette>;
