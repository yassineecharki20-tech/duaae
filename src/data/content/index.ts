/**
 * DUAA — Bundled content snapshot.
 *
 * This module is the single source of truth for the offline-first corpus. It
 * assembles the seed files, validates them (dev only), and pre-builds the
 * lookup maps and the search index once at module load so browsing and typing
 * never pay for it later.
 *
 * Swapping to Firestore means implementing `ContentService` against the network
 * and keeping this module as the built-in fallback — the shapes are identical.
 */

import { logger } from '@/core/utils/logger';
import type { AzkarSession, Dua, DuaCategory } from '@/core/types/domain';

import { CATEGORIES } from './categories';
import { MORNING_AZKAR } from './azkar.morning';
import { EVENING_AZKAR } from './azkar.evening';
import { SLEEP_AZKAR } from './azkar.sleep';
import { TRAVEL_DUAS } from './duas.travel';
import { RIZQ_DUAS } from './duas.rizq';
import { PARENTS_DUAS } from './duas.parents';
import { SUCCESS_DUAS } from './duas.success';
import { HEALING_DUAS } from './duas.healing';
import { FORGIVENESS_DUAS } from './duas.forgiveness';
import { RELIEF_DUAS } from './duas.relief';
import { PRAYER_DUAS } from './duas.prayer';
import { GENERAL_DUAS } from './duas.general';

/* ------------------------------------------------------------------ */
/* Search index                                                        */
/* ------------------------------------------------------------------ */

import { toSearchKey } from '@/core/utils/arabic';

const log = logger.child('content');

/** Bump whenever the corpus changes — used to invalidate any future cache. */
export const CONTENT_VERSION = '1.4.0';

const GROUPS: readonly (readonly Dua[])[] = [
  MORNING_AZKAR,
  EVENING_AZKAR,
  SLEEP_AZKAR,
  TRAVEL_DUAS,
  RIZQ_DUAS,
  PARENTS_DUAS,
  SUCCESS_DUAS,
  HEALING_DUAS,
  FORGIVENESS_DUAS,
  RELIEF_DUAS,
  PRAYER_DUAS,
  GENERAL_DUAS,
];

function assembleDuas(): Dua[] {
  const out: Dua[] = [];
  for (const group of GROUPS) out.push(...group);
  // Stable order: category order first, then the authored order inside it.
  const categoryOrder = new Map(CATEGORIES.map((c, index) => [c.id, index]));
  out.sort((a, b) => {
    const ca = categoryOrder.get(a.categoryId) ?? Number.MAX_SAFE_INTEGER;
    const cb = categoryOrder.get(b.categoryId) ?? Number.MAX_SAFE_INTEGER;
    if (ca !== cb) return ca - cb;
    if (a.order !== b.order) return a.order - b.order;
    return a.id.localeCompare(b.id);
  });
  return out;
}

export const ALL_DUAS: readonly Dua[] = assembleDuas();

export const DUA_BY_ID: ReadonlyMap<string, Dua> = new Map(ALL_DUAS.map((d) => [d.id, d]));

export const DUAS_BY_CATEGORY: ReadonlyMap<string, readonly Dua[]> = (() => {
  const map = new Map<string, Dua[]>();
  for (const category of CATEGORIES) map.set(category.id, []);
  for (const item of ALL_DUAS) {
    const bucket = map.get(item.categoryId);
    if (bucket) bucket.push(item);
  }
  return map;
})();

/** Categories enriched with a real item count (never hardcoded in the UI). */
export const CATEGORIES_WITH_COUNTS: readonly DuaCategory[] = CATEGORIES.map((category) => ({
  ...category,
  itemCount: DUAS_BY_CATEGORY.get(category.id)?.length ?? 0,
}));

export const CATEGORY_BY_ID: ReadonlyMap<string, DuaCategory> = new Map(
  CATEGORIES_WITH_COUNTS.map((c) => [c.id, c]),
);

export const SESSIONS: readonly AzkarSession[] = [
  {
    key: 'morning',
    title: 'أذكار الصباح',
    subtitle: 'من الفجر إلى الشروق',
    categoryId: 'morning',
    windowStartHour: 4,
    windowEndHour: 12,
  },
  {
    key: 'evening',
    title: 'أذكار المساء',
    subtitle: 'من العصر إلى المغرب',
    categoryId: 'evening',
    windowStartHour: 15,
    windowEndHour: 23,
  },
  {
    key: 'sleep',
    title: 'أذكار النوم',
    subtitle: 'قبل النوم',
    categoryId: 'sleep',
    windowStartHour: 21,
    windowEndHour: 4,
  },
] as const;

export const SESSION_BY_KEY: ReadonlyMap<string, AzkarSession> = new Map(
  SESSIONS.map((session) => [session.key, session]),
);

/**
 * Duas eligible for the "daily dua" card. Session items with a repetition count
 * above 10 (e.g. the hundred-times tasbih) are excluded because they read badly
 * as a single daily card.
 */
export const DAILY_DUA_POOL: readonly Dua[] = ALL_DUAS.filter(
  (item) => item.categoryId !== 'morning' && item.categoryId !== 'evening' && item.repeat <= 10,
);

/* ------------------------------------------------------------------ */
/* Dev-time integrity checks                                           */
/* ------------------------------------------------------------------ */

function validate(): void {
  const seen = new Set<string>();
  const problems: string[] = [];
  const validCategories = new Set(CATEGORIES.map((c) => c.id));

  for (const item of ALL_DUAS) {
    if (seen.has(item.id)) problems.push(`duplicate dua id: ${item.id}`);
    seen.add(item.id);
    if (!validCategories.has(item.categoryId)) {
      problems.push(`dua ${item.id} references unknown category ${item.categoryId}`);
    }
    if (!item.text || item.text.length < 4) problems.push(`dua ${item.id} has no text`);
    if (item.sources.length === 0) problems.push(`dua ${item.id} has no source reference`);
    if (!Number.isFinite(item.repeat) || item.repeat < 1) {
      problems.push(`dua ${item.id} has an invalid repeat count`);
    }
  }

  for (const category of CATEGORIES) {
    if (category.kind === 'session' && !category.sessionKey) {
      problems.push(`session category ${category.id} is missing sessionKey`);
    }
  }

  if (problems.length > 0) {
    log.error('content validation failed', { problems, count: problems.length });
    if (__DEV__) {
      throw new Error(`[DUAA content] ${problems.length} problem(s): ${problems.slice(0, 5).join('; ')}`);
    }
  }
}

validate();

export interface DuaSearchEntry {
  dua: Dua;
  /** Concatenated, normalised haystack: text + title + virtue + keywords + category. */
  haystack: string;
  /** Normalised tokens, used for ranked matching. */
  tokens: string[];
  categoryTitle: string;
}

function buildSearchIndex(): readonly DuaSearchEntry[] {
  return ALL_DUAS.map((item) => {
    const category = CATEGORY_BY_ID.get(item.categoryId);
    const categoryTitle = category?.title ?? '';
    const parts = [
      item.text,
      item.title ?? '',
      item.virtue ?? '',
      categoryTitle,
      category?.subtitle ?? '',
      item.keywords.join(' '),
      item.sources.map((source) => `${source.book} ${source.number ?? ''}`).join(' '),
    ];
    const haystack = toSearchKey(parts.join(' '));
    return {
      dua: item,
      haystack,
      tokens: haystack.split(' ').filter(Boolean),
      categoryTitle,
    };
  });
}

export const SEARCH_INDEX: readonly DuaSearchEntry[] = buildSearchIndex();

export const CONTENT_STATS = {
  duaCount: ALL_DUAS.length,
  categoryCount: CATEGORIES.length,
  sessionCount: SESSIONS.length,
  version: CONTENT_VERSION,
} as const;
