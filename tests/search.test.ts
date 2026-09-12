import { MIN_QUERY_LENGTH, entryContains, searchDuas } from '@/features/search/searchEngine';
import { ALL_DUAS, SEARCH_INDEX } from '@/data/content';

describe('searchDuas', () => {
  it('ignores queries shorter than the minimum', () => {
    expect(MIN_QUERY_LENGTH).toBe(2);
    expect(searchDuas('')).toEqual([]);
    expect(searchDuas('ر')).toEqual([]);
  });

  it('finds a well-known phrase without tashkeel or exact alef forms', () => {
    const results = searchDuas('سيد الاستغفار');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].dua.text).toContain('اللَّهُمَّ أَنْتَ رَبِّي');
  });

  it('matches diacritic-free input against vocalised corpus text', () => {
    const results = searchDuas('سبحان الله');
    expect(results.length).toBeGreaterThan(0);
    for (const match of results.slice(0, 3)) {
      expect(entryContains(SEARCH_INDEX.find((e) => e.dua.id === match.dua.id)!, 'سبحان الله')).toBe(true);
    }
  });

  it('ranks an exact phrase above a partial token match', () => {
    const exact = searchDuas('اللهم إني أسألك العفو والعافية');
    expect(exact.length).toBeGreaterThan(0);
    expect(exact[0].score).toBeGreaterThan(exact[exact.length - 1].score);
  });

  it('boosts category-title matches so "أذكار الصباح" surfaces that session', () => {
    const results = searchDuas('أذكار الصباح');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((match) => match.matchedIn === 'category')).toBe(true);
  });

  it('narrows to a single category when asked', () => {
    const results = searchDuas('اللهم', { categoryId: 'rizq' });
    expect(results.length).toBeGreaterThan(0);
    for (const match of results) expect(match.dua.categoryId).toBe('rizq');
  });

  it('respects the limit', () => {
    const results = searchDuas('اللهم', { limit: 3 });
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it('is stable — the same query twice gives the same order', () => {
    const first = searchDuas('الرحمن').map((match) => match.dua.id);
    const second = searchDuas('الرحمن').map((match) => match.dua.id);
    expect(first).toEqual(second);
  });

  it('returns nothing for a query that is not in the corpus', () => {
    expect(searchDuas('zzzqqqxxx')).toEqual([]);
  });

  it('never invents a result outside the bundled corpus', () => {
    const ids = new Set(ALL_DUAS.map((dua) => dua.id));
    for (const match of searchDuas('اللهم')) {
      expect(ids.has(match.dua.id)).toBe(true);
    }
  });

  it('reports which part matched', () => {
    for (const match of searchDuas('الاستغفار')) {
      expect(['text', 'title', 'keyword', 'category', 'source']).toContain(match.matchedIn);
    }
  });
});
