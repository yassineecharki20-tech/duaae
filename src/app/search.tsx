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

const SUGGESTIONS: readonly string[] = ['الصباح', 'الرزق', 'الاستغفار', 'الشفاء', 'الفرج', 'الوالدين'];

const MATCHED_IN_LABEL: Record<SearchMatch['matchedIn'], string> = {
  text: 'في النص',
  title: 'في العنوان',
  keyword: 'في الكلمات المفتاحية',
  category: 'في التصنيف',
  source: 'في المصدر',
};

/**
 * البحث — instant, offline, on-device.
 *
 * Ranking is the pure engine in `features/search`; recent queries are persisted
 * by `searchStore`. Suggestions are real categories from the bundled corpus.
 */
export default function SearchScreen() {
  const theme = useAppTheme();
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
      toast.show(`أُزيل «${term}» من عمليات البحث السابقة`, 'info');
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
        <AppHeader title="البحث" />
      </View>

      <View style={{ paddingTop: theme.spacing.md, gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl }}>
        <TextField
          value={query}
          onChangeText={setQuery}
          placeholder="ابحث في الأدعية والأذكار…"
          icon="search-outline"
          onClear={() => applyQuery('')}
          autoFocus
          returnKeyType="search"
          accessibilityLabel="حقل البحث"
        />

        {/* Category filter */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs }}>
          <Chip
            label="الكل"
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
                  <AppText weight="semiBold">عمليات بحث سابقة</AppText>
                  <AppText
                    tone="subtle"
                    style={{ fontSize: 12 }}
                    onPress={clearRecent}
                    accessibilityRole="button"
                    accessibilityLabel="مسح عمليات البحث السابقة"
                  >
                    مسح
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
                      accessibilityLabel={`ابحث عن ${item}`}
                      trailingAction={{
                        icon: 'close',
                        accessibilityLabel: `إزالة ${item} من السجل`,
                        onPress: () => removeTerm(item),
                        testID: `remove-recent-${item}`,
                      }}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            <View style={{ gap: theme.spacing.sm }}>
              <AppText weight="semiBold">جرّب هذه الكلمات</AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs }}>
                {SUGGESTIONS.map((item) => (
                  <Chip key={item} label={item} onPress={() => applyQuery(item)} />
                ))}
              </View>
            </View>
          </View>
        ) : results.length === 0 ? (
          <EmptyState
            icon="search-outline"
            title="لا نتائج"
            description={`لم نجد نصًّا يطابق «${debounced.trim()}». جرّب كلمة أقصر أو تصفّح التصنيفات.`}
            actionLabel="تصفّح الأدعية"
            onAction={() => router.push('/duas')}
          />
        ) : (
          <View style={{ gap: theme.spacing.sm }}>
            <AppText tone="muted" style={{ fontSize: 12.5 }}>
              {results.length} نتيجة{categoryId ? ' في هذا التصنيف' : ''}
            </AppText>
            {results.map((match) => (
              <View key={match.dua.id}>
                <DuaListItem dua={match.dua} lines={3} />
                <AppText tone="subtle" style={{ fontSize: 11, marginTop: 4 }}>
                  تطابق {MATCHED_IN_LABEL[match.matchedIn]} · {match.categoryTitle}
                </AppText>
              </View>
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}
