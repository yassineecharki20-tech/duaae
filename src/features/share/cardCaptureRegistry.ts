/**
 * Registry of the currently-mounted share-card preview.
 *
 * On native platforms a card can only be rasterised from a *rendered* view, so
 * the `<ShareCardView/>` preview registers itself here on mount and the native
 * rasteriser captures that ref with `react-native-view-shot`. The web renderer
 * never needs this — it draws to a <canvas> directly.
 */

export type CardRef = unknown;

let active: CardRef | null = null;

export function registerCardRef(ref: CardRef): () => void {
  active = ref;
  return () => {
    if (active === ref) active = null;
  };
}

export function getActiveCardRef(): CardRef | null {
  return active;
}

export function hasActiveCardRef(): boolean {
  return active !== null;
}
