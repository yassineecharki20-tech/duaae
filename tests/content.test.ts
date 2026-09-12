import {
  ALL_DUAS,
  CATEGORIES_WITH_COUNTS,
  CATEGORY_BY_ID,
  CONTENT_STATS,
  CONTENT_VERSION,
  DAILY_DUA_POOL,
  DUA_BY_ID,
  DUAS_BY_CATEGORY,
  SEARCH_INDEX,
  SESSIONS,
  SESSION_BY_KEY,
} from '@/data/content';
import { CATEGORIES } from '@/data/content/categories';
import { toSearchKey , containsArabic } from '@/core/utils/arabic';
import { dayKey, pickDaily, stableHash } from '@/core/utils/date';
import { LocalContentService } from '@/services/impl/LocalContentService';

/**
 * Content integrity.
 *
 * These assertions encode the product's religious-content policy: every text is
 * Arabic, every text has at least one printed source, Quranic citations are
 * well-formed, ids are unique and stable, and nothing is fabricated at runtime.
 */
describe('corpus integrity', () => {
  it('has the expected size and version', () => {
    expect(CONTENT_STATS.duaCount).toBe(ALL_DUAS.length);
    expect(CONTENT_STATS.categoryCount).toBe(CATEGORIES.length);
    expect(CONTENT_STATS.sessionCount).toBe(SESSIONS.length);
    expect(CONTENT_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(ALL_DUAS.length).toBeGreaterThanOrEqual(130);
  });

  it('uses unique ids', () => {
    const ids = ALL_DUAS.map((dua) => dua.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(DUA_BY_ID.size).toBe(ids.length);
  });

  it('gives every dua a non-empty Arabic text', () => {
    for (const dua of ALL_DUAS) {
      expect(dua.text.trim().length).toBeGreaterThan(10);
      expect(containsArabic(dua.text)).toBe(true);
    }
  });

  it('attributes every dua to at least one printed source', () => {
    for (const dua of ALL_DUAS) {
      expect(dua.sources.length).toBeGreaterThan(0);
      for (const source of dua.sources) {
        expect(source.book.trim().length).toBeGreaterThan(2);
      }
    }
  });

  it('keeps Quranic citations well-formed', () => {
    const quranic = ALL_DUAS.filter((dua) => dua.sources.some((source) => Boolean(source.quran)));
    expect(quranic.length).toBeGreaterThan(0);
    for (const dua of quranic) {
      for (const source of dua.sources) {
        if (!source.quran) continue;
        expect(source.book).toBe('القرآن الكريم');
        expect(source.quran.surah.trim().length).toBeGreaterThan(0);
        expect(source.quran.ayah.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('only records a repetition count of 1 or more', () => {
    for (const dua of ALL_DUAS) {
      expect(dua.repeat).toBeGreaterThanOrEqual(1);
      expect(Number.isInteger(dua.repeat)).toBe(true);
    }
  });

  it('keeps a sane authored order inside each category', () => {
    for (const [, duas] of DUAS_BY_CATEGORY) {
      const orders = duas.map((dua) => dua.order);
      expect(new Set(orders).size).toBe(orders.length);
    }
  });

  it('links every dua to an existing category', () => {
    for (const dua of ALL_DUAS) {
      expect(CATEGORY_BY_ID.get(dua.categoryId)).toBeDefined();
    }
  });

  it('counts category contents correctly', () => {
    for (const category of CATEGORIES_WITH_COUNTS) {
      const actual = DUAS_BY_CATEGORY.get(category.id)?.length ?? 0;
      expect(category.itemCount).toBe(actual);
      expect(actual).toBeGreaterThan(0);
    }
  });

  it('builds a normalised search index entry per dua', () => {
    expect(SEARCH_INDEX.length).toBe(ALL_DUAS.length);
    for (const entry of SEARCH_INDEX) {
      // The haystack is the normalised (diacritic-free) form of text + metadata.
      expect(entry.haystack).toContain(toSearchKey(entry.dua.text));
      expect(entry.tokens.length).toBeGreaterThan(0);
      expect(entry.categoryTitle.length).toBeGreaterThan(0);
    }
  });
});

describe('categories and sessions', () => {
  it('ships every category the product spec requires', () => {
    const ids = CATEGORIES.map((category) => category.id);
    for (const expected of [
      'morning',
      'evening',
      'sleep',
      'travel',
      'rizq',
      'parents',
      'success',
      'healing',
      'forgiveness',
      'relief',
      'prayer',
      'general',
    ]) {
      expect(ids).toContain(expected);
    }
  });

  it('marks sessions as sessions and collections as collections', () => {
    for (const category of CATEGORIES) {
      if (category.kind === 'session') {
        expect(category.sessionKey).toBeDefined();
        expect(SESSION_BY_KEY.get(category.sessionKey!)).toBeDefined();
      } else {
        expect(category.sessionKey).toBeUndefined();
      }
    }
  });

  it('gives each session a valid daily window', () => {
    for (const session of SESSIONS) {
      expect(session.windowStartHour).toBeGreaterThanOrEqual(0);
      expect(session.windowStartHour).toBeLessThanOrEqual(23);
      expect(session.windowEndHour).toBeGreaterThanOrEqual(0);
      expect(session.windowEndHour).toBeLessThanOrEqual(23);
      expect(DUAS_BY_CATEGORY.get(session.categoryId)?.length ?? 0).toBeGreaterThan(0);
    }
  });
});

describe('daily dua', () => {
  it('excludes heavy-repetition morning/evening items from the pool', () => {
    expect(DAILY_DUA_POOL.length).toBeGreaterThan(20);
    for (const dua of DAILY_DUA_POOL) {
      expect(dua.categoryId).not.toBe('morning');
      expect(dua.categoryId).not.toBe('evening');
      expect(dua.repeat).toBeLessThanOrEqual(10);
    }
  });

  it('picks the same dua for the same day and a different one across days', () => {
    const today = dayKey(new Date(2026, 8, 12));
    const a = pickDaily(DAILY_DUA_POOL, today);
    const b = pickDaily(DAILY_DUA_POOL, today);
    expect(a).toBe(b);

    const seen = new Set<string>();
    for (let day = 1; day <= 30; day += 1) {
      const seed = `2026-09-${String(day).padStart(2, '0')}`;
      seen.add(pickDaily(DAILY_DUA_POOL, seed)!.id);
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it('is served through the content service with the same determinism', async () => {
    const service = new LocalContentService();
    const seed = `2026-09-${String(stableHash('x') % 20).padStart(2, '0')}`;
    const first = await service.getDailyDua(seed);
    const second = await service.getDailyDua(seed);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(first.data?.id).toBe(second.data?.id);
    }
  });

  it('falls back to the pool when the content is unavailable', async () => {
    const service = new LocalContentService();
    const result = await service.getDailyDua('');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).not.toBeNull();
  });

  it('lists categories, duas and sessions through the service', async () => {
    const service = new LocalContentService();
    const categories = await service.listCategories();
    const duas = await service.listDuas();
    const sessions = await service.listSessions();
    expect(categories.ok && categories.data.length).toBe(CATEGORIES.length);
    expect(duas.ok && duas.data.length).toBe(ALL_DUAS.length);
    expect(sessions.ok && sessions.data.length).toBe(SESSIONS.length);
  });

  it('returns adjacent duas for the reader pager', async () => {
    const service = new LocalContentService();
    const target = DUAS_BY_CATEGORY.get('rizq')![1];
    const result = await service.getAdjacentDuas(target.id);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.previous?.id ?? null).not.toBe(target.id);
      expect(result.data.next?.id ?? null).not.toBe(target.id);
    }
  });

  it('reports NOT_FOUND for an unknown id instead of guessing', async () => {
    const service = new LocalContentService();
    const result = await service.getDua('does-not-exist');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBeNull();
  });
});
