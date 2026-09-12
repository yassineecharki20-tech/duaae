import type { Dua } from '@/core/types/domain';
import type { Result } from '@/core/types/Result';

export type ShareFormat = 'text' | 'card';

export interface ShareCardOptions {
  /** Pixel width of the generated image. */
  width?: number;
  /** Light or dark artwork. */
  scheme?: 'light' | 'dark';
  /** Render the branding footer. Always on for shared cards. */
  showBranding?: boolean;
}

export interface ShareCard {
  /** Data URI (web) or `file://` URI (native) of the rendered PNG. */
  uri: string;
  mimeType: string;
  width: number;
  height: number;
  /** Platform-native path when a file was written. */
  filePath?: string;
}

export interface ShareOutcome {
  /** `shared` = user completed the sheet, `copied` = fallback used, `cancelled`. */
  status: 'shared' | 'copied' | 'cancelled' | 'saved';
  message: string;
}

/**
 * Sharing contract.
 *
 * Two real paths, both fully implemented in this stage:
 *   • `shareAsText`  — plain supplication + source + app signature.
 *   • `shareAsCard`  — a generated PNG artwork with DUAA branding.
 *
 * Card rasterisation is platform-specific behind this interface:
 *   web    -> SVG string drawn to a <canvas> and exported as a PNG data URI
 *   native -> `react-native-view-shot` over the real <ShareCardView/>
 * When neither is available the service says so instead of reporting success.
 */
export interface ShareService {
  shareAsText(dua: Dua): Promise<Result<ShareOutcome>>;
  renderCard(dua: Dua, options?: ShareCardOptions): Promise<Result<ShareCard>>;
  shareAsCard(dua: Dua, options?: ShareCardOptions): Promise<Result<ShareOutcome>>;
  /** Save the artwork to the device / trigger a download. */
  saveCard(dua: Dua, options?: ShareCardOptions): Promise<Result<ShareOutcome>>;
  /** Share arbitrary text (used by tasbeeh totals and the community stage). */
  shareText(title: string, message: string, url?: string): Promise<Result<ShareOutcome>>;
  canShareFiles(): Promise<boolean>;
}
