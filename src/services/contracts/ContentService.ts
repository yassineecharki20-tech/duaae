import type { AzkarSession, Dua, DuaCategory } from '@/core/types/domain';
import type { Result } from '@/core/types/Result';

/**
 * Content contract — the single door the UI walks through to reach duas.
 *
 * Today it is served by `LocalContentService` from bundled seed data, which is
 * why the whole app works with the radio off. In the Firebase stage a
 * `FirestoreContentService` implements the same interface and the repository
 * picks it based on `config.firebase.isConfigured`; the UI does not change.
 */
export interface ContentService {
  /** Human-readable version of the content snapshot, for cache invalidation. */
  readonly version: string;
  /** Where the data came from — surfaced in Settings ▸ About for transparency. */
  readonly source: 'bundled' | 'cache' | 'remote';

  listCategories(): Promise<Result<DuaCategory[]>>;
  getCategory(categoryId: string): Promise<Result<DuaCategory | null>>;
  listDuas(categoryId?: string): Promise<Result<Dua[]>>;
  getDua(duaId: string): Promise<Result<Dua | null>>;
  listSessions(): Promise<Result<AzkarSession[]>>;
  getSession(key: string): Promise<Result<AzkarSession | null>>;
  /** Deterministic daily pick — no network, stable for the whole local day. */
  getDailyDua(seed?: string): Promise<Result<Dua | null>>;
  /**
   * Full-text search across dua text, titles, category names and keywords.
   * `limit` keeps the result set cheap to render while typing.
   */
  search(query: string, options?: { limit?: number; categoryId?: string }): Promise<Result<Dua[]>>;
  /** Neighbouring duas inside the same category, for prev/next paging. */
  getAdjacentDuas(duaId: string): Promise<Result<{ previous: Dua | null; next: Dua | null }>>;
}
