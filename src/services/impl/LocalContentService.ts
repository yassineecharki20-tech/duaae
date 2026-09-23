import { AppError } from '@/core/errors/AppError';
import { pickDaily } from '@/core/utils/date';
import { ok, type Result } from '@/core/types/Result';
import { logger } from '@/core/utils/logger';
import type { AzkarSession, Dua, DuaCategory } from '@/core/types/domain';

import {
  ALL_DUAS,
  CATEGORIES_WITH_COUNTS,
  CATEGORY_BY_ID,
  CONTENT_VERSION,
  DAILY_DUA_POOL,
  DUA_BY_ID,
  DUAS_BY_CATEGORY,
  SESSIONS,
  SESSION_BY_KEY,
} from '@/data/content';
import { searchDuas } from '@/features/search/searchEngine';
import { translate } from '@/core/i18n/state';

import type { ContentService } from '../contracts/ContentService';

const log = logger.child('content-service');

/**
 * Offline-first content service backed by the bundled seed snapshot.
 *
 * Reads are synchronous lookups wrapped in promises so the call signature is
 * already `async` — the Firestore implementation can drop in without any call
 * site changing. Nothing here touches the network, so the app renders fully
 * with the radio off.
 */
export class LocalContentService implements ContentService {
  readonly version = CONTENT_VERSION;
  readonly source = 'bundled' as const;

  async listCategories(): Promise<Result<DuaCategory[]>> {
    return ok([...CATEGORIES_WITH_COUNTS]);
  }

  async getCategory(categoryId: string): Promise<Result<DuaCategory | null>> {
    return ok(CATEGORY_BY_ID.get(categoryId) ?? null);
  }

  async listDuas(categoryId?: string): Promise<Result<Dua[]>> {
    if (!categoryId) return ok([...ALL_DUAS]);
    const bucket = DUAS_BY_CATEGORY.get(categoryId);
    if (!bucket) {
      log.warn('listDuas called with unknown category', { categoryId });
      return ok([]);
    }
    return ok([...bucket]);
  }

  async getDua(duaId: string): Promise<Result<Dua | null>> {
    return ok(DUA_BY_ID.get(duaId) ?? null);
  }

  async listSessions(): Promise<Result<AzkarSession[]>> {
    return ok([...SESSIONS]);
  }

  async getSession(key: string): Promise<Result<AzkarSession | null>> {
    return ok(SESSION_BY_KEY.get(key) ?? null);
  }

  async getDailyDua(seed?: string): Promise<Result<Dua | null>> {
    const picked = pickDaily(DAILY_DUA_POOL, seed);
    return ok(picked ?? ALL_DUAS[0] ?? null);
  }

  async search(
    query: string,
    options?: { limit?: number; categoryId?: string },
  ): Promise<Result<Dua[]>> {
    const matches = searchDuas(query, options);
    return ok(matches.map((match) => match.dua));
  }

  async getAdjacentDuas(duaId: string): Promise<Result<{ previous: Dua | null; next: Dua | null }>> {
    const current = DUA_BY_ID.get(duaId);
    if (!current) {
      return { ok: false, error: AppError.notFound(translate('error.feature.dua'), `getAdjacentDuas(${duaId})`) };
    }
    const siblings = DUAS_BY_CATEGORY.get(current.categoryId) ?? [];
    const index = siblings.findIndex((item) => item.id === duaId);
    return ok({
      previous: index > 0 ? siblings[index - 1] : null,
      next: index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : null,
    });
  }
}
