import { Platform, Share } from 'react-native';

import { AppError } from '@/core/errors/AppError';
import { err, ok, type Result } from '@/core/types/Result';
import { logger } from '@/core/utils/logger';
import type { Dua } from '@/core/types/domain';

import { buildShareText } from '@/features/share/shareText';
import { renderShareCard, type RenderedCard } from '@/features/share/renderShareCard';
import { CATEGORY_BY_ID, DUA_BY_ID } from '@/data/content';
import { translate } from '@/core/i18n/state';

import type { ClipboardService } from '../contracts/ClipboardService';
import type {
  ShareCard,
  ShareCardOptions,
  ShareOutcome,
  ShareService,
} from '../contracts/ShareService';

const log = logger.child('share');

/**
 * Sharing implementation for every platform.
 *
 * • text  — native: RN `Share`; web: Web Share API, clipboard fallback.
 * • card  — rendered per platform (canvas on web, view-shot of the live preview
 *           on native), then shared as a real PNG file where the OS allows it,
 *           saved as a download on web, copied to Documents on native.
 *
 * Every branch reports what actually happened (`shared`, `saved`, `copied`,
 * `cancelled`). A cancelled sheet is a success-with-status, never an error.
 */
export class UniversalShareService implements ShareService {
  constructor(private readonly clipboard: ClipboardService) {}

  private categoryTitle(dua: Dua): string | undefined {
    return CATEGORY_BY_ID.get(dua.categoryId)?.title;
  }

  async shareAsText(dua: Dua): Promise<Result<ShareOutcome>> {
    const message = buildShareText(dua, { categoryTitle: this.categoryTitle(dua) });
    return this.shareText(dua.title ?? translate('app.name'), message);
  }

  async shareText(title: string, message: string, url?: string): Promise<Result<ShareOutcome>> {
    try {
      if (Platform.OS === 'web') {
        return await this.shareTextWeb(title, message, url);
      }
      const result = await Share.share({ message, title }, { dialogTitle: title });
      if (result.action === Share.sharedAction) {
        return ok({ status: 'shared', message: translate('share.success') });
      }
      return ok({ status: 'cancelled', message: translate('share.cancelled') });
    } catch (cause) {
      const error = String(cause);
      if (error.includes('CANCEL') || error.includes('cancel')) {
        return ok({ status: 'cancelled', message: translate('share.cancelled') });
      }
      log.error('shareText failed', cause);
      return err(AppError.from(cause, 'share.shareText'));
    }
  }

  private async shareTextWeb(title: string, message: string, url?: string): Promise<Result<ShareOutcome>> {
    const nav = globalThis.navigator as Navigator & {
      share?: (data: ShareData) => Promise<void>;
      canShare?: (data: ShareData) => boolean;
    };

    if (typeof nav.share === 'function') {
      try {
        await nav.share({ title, text: message, url });
        return ok({ status: 'shared', message: translate('share.success') });
      } catch (cause) {
        const name = (cause as DOMException | undefined)?.name;
        if (name === 'AbortError') {
          return ok({ status: 'cancelled', message: translate('share.cancelled') });
        }
        log.warn('navigator.share failed, falling back to clipboard', cause);
      }
    }

    const copied = await this.clipboard.copy(message);
    if (!copied.ok) return err(copied.error);
    return ok({ status: 'copied', message: translate('share.copiedToClipboard') });
  }

  async renderCard(dua: Dua, options: ShareCardOptions = {}): Promise<Result<ShareCard>> {
    try {
      const rendered: RenderedCard = await renderShareCard(dua, options.scheme ?? 'light');

      if (Platform.OS === 'web') {
        return ok({
          uri: rendered.dataUri,
          mimeType: 'image/png',
          width: rendered.width,
          height: rendered.height,
        });
      }

      if (!rendered.filePath) {
        return err(
          AppError.from(
            new Error('view-shot did not return a file path'),
            'share.renderCard.native',
          ),
        );
      }
      return ok({
        uri: rendered.filePath,
        mimeType: 'image/png',
        width: rendered.width,
        height: rendered.height,
        filePath: rendered.filePath,
      });
    } catch (cause) {
      log.error('renderCard failed', cause);
      return err(AppError.from(cause, 'share.renderCard'));
    }
  }

  async shareAsCard(dua: Dua, options: ShareCardOptions = {}): Promise<Result<ShareOutcome>> {
    const card = await this.renderCard(dua, options);
    if (!card.ok) return err(card.error);

    try {
      if (Platform.OS === 'web') {
        return await this.shareCardWeb(card.data);
      }
      // Native: system share sheet with the PNG file.
      const Sharing = await import('expo-sharing');
      if (!(await Sharing.isAvailableAsync())) {
        return err(AppError.unsupported(translate('error.feature.sharing')));
      }
      await Sharing.shareAsync(card.data.filePath ?? card.data.uri, {
        mimeType: 'image/png',
        dialogTitle: translate('share.dialogTitle'),
        UTI: 'public.png',
      });
      return ok({ status: 'shared', message: translate('share.cardShared') });
    } catch (cause) {
      log.error('shareAsCard failed', cause);
      return err(AppError.from(cause, 'share.shareAsCard'));
    }
  }

  private async shareCardWeb(card: ShareCard): Promise<Result<ShareOutcome>> {
    const nav = globalThis.navigator as Navigator & {
      share?: (data: ShareData) => Promise<void>;
      canShare?: (data: ShareData) => boolean;
    };
    const blob = dataUriToBlob(card.uri);

    if (blob && typeof nav.share === 'function' && typeof nav.canShare === 'function') {
      const file = new File([blob], 'duaa-card.png', { type: 'image/png' });
      const payload: ShareData = { files: [file], title: translate('app.name') };
      if (nav.canShare(payload)) {
        try {
          await nav.share(payload);
          return ok({ status: 'shared', message: translate('share.cardShared') });
        } catch (cause) {
          if ((cause as DOMException | undefined)?.name === 'AbortError') {
            return ok({ status: 'cancelled', message: translate('share.cancelled') });
          }
          log.warn('navigator.share(file) failed, saving instead', cause);
        }
      }
    }

    // Fallback: download the artwork.
    if (blob) {
      downloadBlob(blob, 'duaa-card.png');
      return ok({ status: 'saved', message: translate('share.cardSavedDownloads') });
    }
    return err(AppError.unsupported(translate('error.feature.saveCard'), 'canvas export unavailable'));
  }

  async saveCard(dua: Dua, options: ShareCardOptions = {}): Promise<Result<ShareOutcome>> {
    const card = await this.renderCard(dua, options);
    if (!card.ok) return err(card.error);

    try {
      if (Platform.OS === 'web') {
        const blob = dataUriToBlob(card.data.uri);
        if (!blob) return err(AppError.unsupported(translate('error.feature.saveCard')));
        downloadBlob(blob, `duaa-${dua.id}.png`);
        return ok({ status: 'saved', message: translate('share.cardSavedDownloads') });
      }

      const { File, Paths } = await import('expo-file-system');
      const source = new File(card.data.filePath ?? card.data.uri);
      const destination = new File(Paths.document, `duaa-${dua.id}-${Date.now()}.png`);
      source.copy(destination);
      const exists = destination.exists ?? false;
      if (!exists) {
        return err(AppError.storage(translate('share.cardSaveIncomplete')));
      }
      return ok({ status: 'saved', message: translate('share.cardSavedAppFiles') });
    } catch (cause) {
      log.error('saveCard failed', cause);
      return err(AppError.from(cause, 'share.saveCard'));
    }
  }

  async canShareFiles(): Promise<boolean> {
    if (Platform.OS === 'web') {
      const nav = globalThis.navigator as Navigator & { canShare?: (data: ShareData) => boolean };
      if (typeof nav.canShare !== 'function') return false;
      try {
        return nav.canShare({ files: [new File(['x'], 'x.png', { type: 'image/png' })] });
      } catch {
        return false;
      }
    }
    try {
      const Sharing = await import('expo-sharing');
      return await Sharing.isAvailableAsync();
    } catch {
      return false;
    }
  }
}

/* ------------------------------------------------------------------ */
/* Web helpers                                                         */
/* ------------------------------------------------------------------ */

function dataUriToBlob(dataUri: string): Blob | null {
  try {
    const [head, base64] = dataUri.split(',');
    const mime = /data:(.*?);base64/.exec(head)?.[1] ?? 'image/png';
    const binary = globalThis.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  } catch (cause) {
    log.error('dataUriToBlob failed', cause);
    return null;
  }
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Convenience for screens: resolve a dua then share its text. */
export async function shareDuaTextById(
  service: ShareService,
  duaId: string,
): Promise<Result<ShareOutcome>> {
  const dua = DUA_BY_ID.get(duaId);
  if (!dua) return err(AppError.notFound(translate('error.feature.dua')));
  return service.shareAsText(dua);
}
