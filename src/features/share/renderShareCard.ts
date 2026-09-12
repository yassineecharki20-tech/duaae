/**
 * Platform-split module shim.
 *
 * Metro resolves `renderShareCard.native.ts` (iOS/Android) or
 * `renderShareCard.web.ts` (web) and never loads this file — platform-specific
 * extensions win over the base name. It exists so TypeScript can type-check the
 * call sites (`@/features/share/renderShareCard`) and so a hypothetical future
 * platform fails loudly with a clear message instead of silently shipping the
 * wrong renderer.
 *
 * Keep the exported surface in sync with both platform files.
 */

import type { Dua } from '@/core/types/domain';

export interface RenderedCard {
  /** Data URI (web) or `file://` URI (native). */
  dataUri: string;
  width: number;
  height: number;
  /** Present on native, where view-shot writes a real file. */
  filePath?: string;
}

/** Thrown by the native renderer when no `<ShareCardView/>` is mounted. */
export class NoCardPreviewError extends Error {
  constructor() {
    super('No share-card preview is mounted, so the card cannot be captured.');
    this.name = 'NoCardPreviewError';
  }
}

export async function renderShareCard(
  _dua: Dua,
  _scheme: 'light' | 'dark' = 'light',
): Promise<RenderedCard> {
  throw new Error(
    'renderShareCard has no implementation for this platform. Add renderShareCard.<platform>.ts.',
  );
}
