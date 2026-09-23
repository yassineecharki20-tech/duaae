import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';

import { useAppTheme } from '@/design/theme/ThemeProvider';
import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppText } from '@/components/ui/AppText';
import { Chip } from '@/components/ui/Chip';
import { TextField } from '@/components/ui/Controls';
import { EmptyState } from '@/components/ui/StateViews';
import { useToast } from '@/components/ui/Toast';
import { DuaListItem } from '@/components/duas/DuaListItem';

import { searchDuas, MIN_QUERY_LENGTH, type SearchMatch } from '@/features/search/searchEngine';
import { useSearchStore } from '@/store/searchStore';
import { services } from '@/services/registry';
import { AnalyticsEvents } from '@/services/contracts/AnalyticsService';
import { CATEGORIES_WITH_COUNTS } from '@/data/content';
import { useI18n } from '@/core/i18n/I18nProvider';
import type { Translate } from '@/core/i18n/options';

/** Suggestion chips — rebuilt whenever the language changes. */
const SUGGESTION_KEYS = [
  'search.suggest.morning',
  'search.suggest.rizq',
  'search.suggest.forgiveness',
  'search.suggest.healing',
  'search.suggest.relief',
  'search.suggest.parents',
] as const;

function buildSuggestions(t: Translate): string[] {
  return SUGGESTION_KEYS.map((key) => t(key));
}

function buildMatchedInLabels(t: Translate): Record<SearchMatch['matchedIn'], string> {
  return {
    text: t('search.match.text'),
    title: t('search.match.title'),
    keyword: t('search.match.keyword'),
    category: t('search.match.category'),
    source: t('search.match.source'),
  };
}

/**
 * البحث — instant, offline, on-device.
 *
 * Ranking is the pure engine in `features/search`; recent queries are persisted
 * by `searchStore`. Suggestions are real categories from the bundled corpus.
 */
export default function SearchScreen() {
  const theme = useAppTheme();
  const { t, tp } = useI18n();
  const suggestions = useMemo(() => buildSuggestions(t), [t]);
  const matchedInLabel = useMemo(() => buildMatchedInLabels(t), [t]);
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trackedFor = useRef('');

  const recent = useSearchStore((state) => state.recent);
  const addRecent = useSearchStore((state) => state.addRecent);
  const removeRecent = useSearchStore((state) => state.removeRecent);
  const clearRecent = useSearchStore((state) => state.clearRecent);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setDebounced(query.trim()), 160);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query]);

  const results = useMemo(
    () => searchDuas(debounced, { limit: 80, categoryId: categoryId ?? undefined }),
    [categoryId, debounced],
  );

  useEffect(() => {
    const key = debounced.trim();
    if (key.length < MIN_QUERY_LENGTH || trackedFor.current === key) return;
    trackedFor.current = key;
    addRecent(key);
    void services
      .analytics()
      .track({
        name: results.length === 0 ? AnalyticsEvents.searchNoResults : AnalyticsEvents.searchPerformed,
        params: { query: key, count: results.length },
      });
  }, [addRecent, debounced, results.length]);

  /**
   * Removes one term from the persisted history. Reachable two ways: the ×
   * control on the chip (works with any input method) and a long press (native
   * shortcut). Both confirm through the toast so the action is never silent.
   */
  const removeTerm = useCallback(
    (term: string) => {
      removeRecent(term);
      toast.show(t('search.recentRemoved', { term }), 'info');
    },
    [removeRecent, toast],
  );

  const applyQuery = useCallback((value: string) => {
    setQuery(value);
    setDebounced(value.trim());
  }, []);

  const showResults = debounced.trim().length >= MIN_QUERY_LENGTH;

  return (
    <Screen scroll testID="search-screen">
      <View style={{ marginHorizontal: -theme.layout.screenGutter }}>
        <AppHeader title={t('search.screenTitle')} />
      </View>

      <View style={{ paddingTop: theme.spacing.md, gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl }}>
        <TextField
          value={query}
          onChangeText={setQuery}
          placeholder={t('search.placeholder')}
          icon="search-outline"
          onClear={() => applyQuery('')}
          autoFocus
          returnKeyType="search"
          accessibilityLabel={t('search.fieldA11y')}
        />

        {/* Category filter */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs }}>
          <Chip
            label={t('common.all')}
            tone={categoryId === null ? 'primary' : 'neutral'}
            onPress={() => setCategoryId(null)}
          />
          {CATEGORIES_WITH_COUNTS.slice(0, 10).map((category) => (
            <Chip
              key={category.id}
              label={category.title}
              tone={categoryId === category.id ? 'primary' : 'neutral'}
              onPress={() => setCategoryId(category.id === categoryId ? null : category.id)}
            />
          ))}
        </View>

        {!showResults ? (
          <View style={{ gap: theme.spacing.lg }}>
            {recent.length > 0 ? (
              <View style={{ gap: theme.spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <AppText weight="semiBold">{t('search.recentTitle')}</AppText>
                  <AppText
                    tone="subtle"
                    style={{ fontSize: 12 }}
                    onPress={clearRecent}
                    accessibilityRole="button"
                    accessibilityLabel={t('search.recentClearA11y')}
                  >
                    {t('search.recentClear')}
                  </AppText>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs }}>
                  {recent.map((item) => (
                    <Chip
                      key={item}
                      label={item}
                      icon="time-outline"
                      onPress={() => applyQuery(item)}
                      onLongPress={() => removeTerm(item)}
                      accessibilityLabel={t('search.recentOpenA11y', { term: item })}
                      trailingAction={{
                        icon: 'close',
                        accessibilityLabel: t('search.recentRemoveA11y', { term: item }),
                        onPress: () => removeTerm(item),
                        testID: `remove-recent-${item}`,
                      }}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            <View style={{ gap: theme.spacing.sm }}>
              <AppText weight="semiBold">{t('search.suggestionsTitle')}</AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs }}>
                {suggestions.map((item) => (
                  <Chip key={item} label={item} onPress={() => applyQuery(item)} />
                ))}
              </View>
            </View>
          </View>
        ) : results.length === 0 ? (
          <EmptyState
            icon="search-outline"
            title={t('search.noResultsTitle')}
            description={t('search.noResultsBody', { query: debounced.trim() })}
            actionLabel={t('search.browseDuas')}
            onAction={() => router.push('/duas')}
          />
        ) : (
          <View style={{ gap: theme.spacing.sm }}>
            <AppText tone="muted" style={{ fontSize: 12.5 }}>
              {tp('search.resultsCount', results.length)}
              {categoryId ? t('search.resultsInCategory') : ''}
            </AppText>
            {results.map((match) => (
              <View key={match.dua.id}>
                <DuaListItem dua={match.dua} lines={3} />
                <AppText tone="subtle" style={{ fontSize: 11, marginTop: 4 }}>
                  {t('search.matchLine', {
                    where: matchedInLabel[match.matchedIn],
                    category: match.categoryTitle,
                  })}
                </AppText>
              </View>
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}
