/**
 * Native share-card renderer.
 *
 * The card is a real React Native view (`<ShareCardView/>`) that the share
 * sheet mounts as a live preview; we rasterise that exact view with
 * `react-native-view-shot`, so what the user previews is byte-for-byte what
 * gets shared. If no preview is mounted we say so instead of guessing.
 */

import { captureRef } from 'react-native-view-shot';

import type { Dua } from '@/core/types/domain';
import { getActiveCardRef } from './cardCaptureRegistry';

export interface RenderedCard {
  dataUri: string;
  width: number;
  height: number;
  /** `file://` URI written by view-shot — directly shareable. */
  filePath?: string;
}

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
  const ref = getActiveCardRef();
  if (!ref) throw new NoCardPreviewError();

  const uri = await captureRef(ref as never, {
    format: 'png',
    quality: 1,
    result: 'tmpfile',
  });

  return { dataUri: uri, width: 1080, height: 1350, filePath: uri };
}
