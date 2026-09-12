/**
 * DUAA — Search engine.
 *
 * Pure and synchronous so it is trivially unit-testable and fast enough to run
 * on every keystroke over ~100 documents. Ranking:
 *   1. exact normalised phrase match in the hay (highest)
 *   2. a token that *starts with* a query token
 *   3. a token that merely contains a query token
 *   4. category-title matches (boosted so "أذكار الصباح" surfaces that category)
 * Ties break on the authored order so results never jitter while typing.
 */

import { toSearchKey } from '@/core/utils/arabic';
import type { Dua } from '@/core/types/domain';

import { SEARCH_INDEX, type DuaSearchEntry } from '@/data/content';

export interface SearchMatch {
  dua: Dua;
  categoryTitle: string;
  score: number;
  /** Which part matched — used to render a subtle "match in category" hint. */
  matchedIn: 'text' | 'title' | 'keyword' | 'category' | 'source';
}

export interface SearchOptions {
  limit?: number;
  categoryId?: string;
}

const SCORE = {
  exactPhrase: 100,
  titlePhrase: 90,
  keywordPhrase: 70,
  categoryPhrase: 60,
  tokenPrefix: 40,
  tokenContains: 25,
  sourceMatch: 15,
} as const;

/** Minimum query length worth searching; shorter input returns []. */
export const MIN_QUERY_LENGTH = 2;

export function searchDuas(rawQuery: string, options: SearchOptions = {}): SearchMatch[] {
  const { limit = 60, categoryId } = options;
  const query = toSearchKey(rawQuery ?? '');

  if (query.length < MIN_QUERY_LENGTH) return [];

  const queryTokens = query.split(' ').filter(Boolean);
  if (queryTokens.length === 0) return [];

  const results: SearchMatch[] = [];

  for (const entry of SEARCH_INDEX) {
    if (categoryId && entry.dua.categoryId !== categoryId) continue;

    let score = 0;
    let matchedIn: SearchMatch['matchedIn'] = 'text';

    if (entry.haystack.includes(query)) {
      score += SCORE.exactPhrase;
      const titleKey = toSearchKey(entry.dua.title ?? '');
      if (titleKey && titleKey.includes(query)) {
        score += SCORE.titlePhrase;
        matchedIn = 'title';
      } else if (toSearchKey(entry.categoryTitle).includes(query)) {
        score += SCORE.categoryPhrase;
        matchedIn = 'category';
      } else if (entry.dua.keywords.some((keyword) => toSearchKey(keyword).includes(query))) {
        score += SCORE.keywordPhrase;
        matchedIn = 'keyword';
      }
    } else {
      // Token-level scoring.
      for (const token of queryTokens) {
        let best = 0;
        for (const hayToken of entry.tokens) {
          if (hayToken.startsWith(token)) best = Math.max(best, SCORE.tokenPrefix);
          else if (hayToken.includes(token)) best = Math.max(best, SCORE.tokenContains);
        }
        if (best === 0 && toSearchKey(entry.categoryTitle).includes(token)) {
          best = SCORE.categoryPhrase / 2;
          matchedIn = 'category';
        }
        if (best === 0) {
          const sourceKey = entry.dua.sources
            .map((source) => toSearchKey(`${source.book} ${source.number ?? ''}`))
            .join(' ');
          if (sourceKey.includes(token)) {
            best = SCORE.sourceMatch;
            matchedIn = 'source';
          }
        }
        score += best;
      }
    }

    if (score > 0) {
      results.push({ dua: entry.dua, categoryTitle: entry.categoryTitle, score, matchedIn });
    }
  }

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.dua.order - b.dua.order;
  });

  return results.slice(0, limit);
}

/** Cheap highlight helper: does this dua's text contain the query? */
export function entryContains(entry: DuaSearchEntry, rawQuery: string): boolean {
  const query = toSearchKey(rawQuery);
  return query.length > 0 && entry.haystack.includes(query);
}
