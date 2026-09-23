import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';

import { useAppTheme } from '@/design/theme/ThemeProvider';
import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { IconButton } from '@/components/ui/IconButton';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Segmented, TextField } from '@/components/ui/Controls';
import { SettingsRow, SettingsSection } from '@/components/ui/SettingsRow';
import { EmptyState } from '@/components/ui/StateViews';
import { DuaListItem } from '@/components/duas/DuaListItem';
import { Skeleton } from '@/components/ui/Progress';
import { useToast } from '@/components/ui/Toast';

import { selectFavoriteCollections, useFavoritesStore } from '@/store/favoritesStore';
import { MAX_COLLECTION_NAME } from '@/services/contracts/FavoritesService';
import { CATEGORY_BY_ID, DUA_BY_ID } from '@/data/content';
import { toSearchKey } from '@/core/utils/arabic';
import { localeTagFor } from '@/core/i18n/state';
import type { Dua, FavoriteCollection, FavoriteEntry } from '@/core/types/domain';
import { useI18n } from '@/core/i18n/I18nProvider';

type FavoriteSort = 'recent' | 'title';

interface FavoriteRow {
  entry: FavoriteEntry;
  dua: Dua;
}

/**
 * Favorites — real entries, real controls.
 *
 * Everything here reads and writes `FavoritesService` through the store: search
 * inside the saved set, filter by category or by collection, sort by newest or
 * by title, and organize entries into named collections. Collections are local
 * data today and sync with the account in the Firebase stage; deleting one
 * never deletes the duas inside it.
 */
export default function FavoritesScreen() {
  const theme = useAppTheme();
  const { t, tp, language } = useI18n();
  const toast = useToast();

  const entries = useFavoritesStore((state) => state.entries);
  const collections = useFavoritesStore(selectFavoriteCollections);
  const hydrated = useFavoritesStore((state) => state.hydrated);
  const createCollection = useFavoritesStore((state) => state.createCollection);
  const renameCollection = useFavoritesStore((state) => state.renameCollection);
  const deleteCollection = useFavoritesStore((state) => state.deleteCollection);
  const setEntryCollections = useFavoritesStore((state) => state.setEntryCollections);

  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [sort, setSort] = useState<FavoriteSort>('recent');

  // Sheet state: one variable per sheet keeps them mutually exclusive.
  const [nameSheet, setNameSheet] = useState<{ mode: 'create' } | { mode: 'rename'; id: string } | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [pendingDelete, setPendingDelete] = useState<FavoriteCollection | null>(null);
  const [assignFor, setAssignFor] = useState<FavoriteRow | null>(null);
  const [manageOpen, setManageOpen] = useState(false);

  const rows = useMemo<FavoriteRow[]>(
    () =>
      entries
        .map((entry) => ({ entry, dua: DUA_BY_ID.get(entry.duaId) }))
        .filter((row): row is FavoriteRow => row.dua !== undefined),
    [entries],
  );

  const filtered = useMemo(() => {
    const needle = toSearchKey(query);
    const locale = localeTagFor(language);
    return rows
      .filter(({ entry, dua }) => {
        if (categoryId && dua.categoryId !== categoryId) return false;
        if (collectionId && !(entry.collectionIds ?? []).includes(collectionId)) return false;
        if (!needle) return true;
        const haystack = toSearchKey([dua.title ?? '', dua.text, dua.virtue ?? '', ...dua.keywords].join(' '));
        return haystack.includes(needle);
      })
      .sort((a, b) =>
        sort === 'title'
          ? (a.dua.title ?? a.dua.text).localeCompare(b.dua.title ?? b.dua.text, locale)
          : new Date(b.entry.addedAt).getTime() - new Date(a.entry.addedAt).getTime(),
      );
  }, [rows, query, categoryId, collectionId, sort, language]);

  const categories = useMemo(() => {
    const ids = [...new Set(rows.map((row) => row.dua.categoryId))];
    return ids
      .map((id) => CATEGORY_BY_ID.get(id))
      .filter((category): category is NonNullable<typeof category> => Boolean(category));
  }, [rows]);

  const countFor = useCallback(
    (id: string) => rows.filter((row) => (row.entry.collectionIds ?? []).includes(id)).length,
    [rows],
  );

  const missing = entries.length - rows.length;
  const filtering = query.trim().length > 0 || categoryId !== null || collectionId !== null;

  const submitName = useCallback(async () => {
    if (!nameSheet) return;
    const result =
      nameSheet.mode === 'create'
        ? await createCollection(nameDraft)
        : await renameCollection(nameSheet.id, nameDraft);

    if (!result.ok) {
      toast.show(result.error.userMessage, 'error');
      return;
    }
    const saved = nameDraft.trim();
    toast.show(
      nameSheet.mode === 'create'
        ? t('favorites.collectionCreated', { name: saved })
        : t('favorites.collectionRenamed', { name: saved }),
      'success',
    );
    setNameSheet(null);
    setNameDraft('');
  }, [createCollection, nameDraft, nameSheet, renameCollection, t, toast]);

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    const result = await deleteCollection(pendingDelete.id);
    if (result.ok) {
      if (collectionId === pendingDelete.id) setCollectionId(null);
      toast.show(t('favorites.collectionDeleted', { name: pendingDelete.name }), 'success');
    } else {
      toast.show(result.error.userMessage, 'error');
    }
    setPendingDelete(null);
  }, [collectionId, deleteCollection, pendingDelete, t, toast]);

  const toggleMembership = useCallback(
    async (row: FavoriteRow, collection: FavoriteCollection, next: boolean) => {
      const current = row.entry.collectionIds ?? [];
      const ids = next
        ? [...current, collection.id]
        : current.filter((id) => id !== collection.id);
      const result = await setEntryCollections(row.dua.id, ids);
      if (result.ok) {
        setAssignFor((previous) =>
          previous && previous.dua.id === row.dua.id
            ? { entry: { ...previous.entry, collectionIds: ids }, dua: previous.dua }
            : previous,
        );
        toast.show(
          next
            ? t('favorites.addToCollection')
            : t('favorites.removeFromCollection'),
          'info',
        );
      } else {
        toast.show(result.error.userMessage, 'error');
      }
    },
    [setEntryCollections, t, toast],
  );

  return (
    <Screen scroll testID="favorites-screen">
      <View style={{ marginHorizontal: -theme.layout.screenGutter }}>
        <AppHeader
          title={t('duas.favorites')}
          subtitle={hydrated ? tp('favorites.countSummary', entries.length) : undefined}
        />
      </View>

      <View style={{ paddingTop: theme.spacing.lg, gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl }}>
        {!hydrated ? (
          <View style={{ gap: theme.spacing.md }}>
            <Skeleton height={92} radius={theme.radii.lg} />
            <Skeleton height={92} radius={theme.radii.lg} />
          </View>
        ) : (
          <>
            {/* Collections */}
            <View style={{ gap: theme.spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="heading">{t('favorites.collections')}</AppText>
                  <AppText tone="subtle" style={{ fontSize: 12 }}>
                    {collections.length === 0 ? t('favorites.collectionsSubtitle') : tp('favorites.collectionCount', collections.length)}
                  </AppText>
                </View>
                <View style={{ flexDirection: 'row', gap: theme.spacing.xs }}>
                  <IconButton
                    icon="add-outline"
                    accessibilityLabel={t('favorites.collectionCreate')}
                    testID="collection-create"
                    onPress={() => {
                      setNameDraft('');
                      setNameSheet({ mode: 'create' });
                    }}
                  />
                  {collections.length > 0 ? (
                    <IconButton
                      icon="albums-outline"
                      accessibilityLabel={t('favorites.collections')}
                      testID="collection-manage"
                      onPress={() => setManageOpen(true)}
                    />
                  ) : null}
                </View>
              </View>

              {collections.length === 0 ? (
                <Card variant="outline" padding={theme.spacing.md} testID="collections-empty">
                  <AppText tone="subtle" style={{ fontSize: 12.5, lineHeight: 19 }}>
                    {t('favorites.noCollections')} — {t('favorites.suggestedCollections')}
                  </AppText>
                </Card>
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs }}>
                  <Chip
                    label={t('favorites.filterAll')}
                    icon="apps-outline"
                    selected={collectionId === null}
                    tone={collectionId === null ? 'primary' : 'neutral'}
                    onPress={() => setCollectionId(null)}
                  />
                  {collections.map((collection) => (
                    <Chip
                      key={collection.id}
                      label={`${collection.name} · ${countFor(collection.id)}`}
                      icon="folder-outline"
                      selected={collectionId === collection.id}
                      tone={collectionId === collection.id ? 'primary' : 'neutral'}
                      onPress={() =>
                        setCollectionId((current) => (current === collection.id ? null : collection.id))
                      }
                      testID={`collection-${collection.id}`}
                    />
                  ))}
                </View>
              )}
            </View>

            {rows.length === 0 ? (
              <EmptyState
                icon="heart-outline"
                title={t('favorites.emptyTitle')}
                description={t('favorites.emptyBody')}
                actionLabel={t('favorites.browse')}
                onAction={() => router.replace('/duas')}
              />
            ) : (
              <>
                {/* Search, category filter, sort */}
                <View style={{ gap: theme.spacing.sm }}>
                  <TextField
                    value={query}
                    onChangeText={setQuery}
                    placeholder={t('favorites.searchPlaceholder')}
                    accessibilityLabel={t('favorites.searchA11y')}
                    icon="search-outline"
                    onClear={() => setQuery('')}
                    returnKeyType="search"
                    testID="favorites-search"
                  />

                  {categories.length > 1 ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs }}>
                      <Chip
                        label={t('favorites.filterCategory')}
                        icon="pricetag-outline"
                        selected={categoryId === null}
                        tone={categoryId === null ? 'primary' : 'neutral'}
                        onPress={() => setCategoryId(null)}
                      />
                      {categories.map((category) => (
                        <Chip
                          key={category.id}
                          label={category.title}
                          selected={categoryId === category.id}
                          tone={categoryId === category.id ? 'primary' : 'neutral'}
                          onPress={() =>
                            setCategoryId((current) => (current === category.id ? null : category.id))
                          }
                        />
                      ))}
                    </View>
                  ) : null}

                  <Segmented<FavoriteSort>
                    options={[
                      { value: 'recent', label: t('favorites.sortRecent') },
                      { value: 'title', label: t('favorites.sortTitle') },
                    ]}
                    value={sort}
                    onChange={setSort}
                    accessibilityLabel={t('favorites.sortLabel')}
                    testID="favorites-sort"
                  />
                </View>

                {filtered.length === 0 ? (
                  <EmptyState
                    icon="filter-outline"
                    title={t('favorites.noResults')}
                    description={t('favorites.noResultsBody')}
                    actionLabel={t('common.reset')}
                    onAction={() => {
                      setQuery('');
                      setCategoryId(null);
                      setCollectionId(null);
                    }}
                  />
                ) : (
                  <View style={{ gap: theme.spacing.sm }}>
                    {filtered.map((row) => (
                      <DuaListItem
                        key={row.dua.id}
                        dua={row.dua}
                        lines={3}
                        showCategory
                        categoryTitle={CATEGORY_BY_ID.get(row.dua.categoryId)?.title}
                        testID={`favorite-${row.dua.id}`}
                        trailingAccessory={
                          <IconButton
                            icon="folder-open-outline"
                            size={36}
                            accessibilityLabel={t('favorites.addToCollection')}
                            testID={`assign-${row.dua.id}`}
                            onPress={() => setAssignFor(row)}
                          />
                        }
                      />
                    ))}
                    {missing > 0 ? (
                      <AppText tone="subtle" style={{ fontSize: 12 }}>
                        {tp('favorites.missingItems', missing)}
                      </AppText>
                    ) : null}
                    {filtering ? (
                      <AppText tone="subtle" style={{ fontSize: 12 }}>
                        {tp('search.resultsCount', filtered.length)}
                      </AppText>
                    ) : null}
                  </View>
                )}
              </>
            )}
          </>
        )}
      </View>

      {/* Create / rename a collection */}
      <BottomSheet
        visible={nameSheet !== null}
        onDismiss={() => setNameSheet(null)}
        title={nameSheet?.mode === 'rename' ? t('favorites.collectionRename') : t('favorites.collectionCreateTitle')}
        subtitle={t('favorites.collectionCreateSubtitle')}
        scrollable={false}
        testID="collection-name-sheet"
      >
        <View style={{ gap: theme.spacing.md, paddingBottom: theme.spacing.lg }}>
          <TextField
            value={nameDraft}
            onChangeText={setNameDraft}
            label={t('favorites.collectionNameLabel')}
            placeholder={t('favorites.collectionNamePlaceholder')}
            accessibilityLabel={t('favorites.collectionNameA11y')}
            maxLength={MAX_COLLECTION_NAME}
            autoFocus
            returnKeyType="done"
            onSubmit={() => void submitName()}
            testID="collection-name-field"
          />
          <Button
            label={nameSheet?.mode === 'rename' ? t('common.save') : t('common.create')}
            onPress={() => void submitName()}
            disabled={nameDraft.trim().length === 0}
          />
        </View>
      </BottomSheet>

      {/* Rename / delete existing collections */}
      <BottomSheet
        visible={manageOpen}
        onDismiss={() => setManageOpen(false)}
        title={t('favorites.collections')}
        subtitle={t('favorites.collectionsSubtitle')}
        testID="collection-manage-sheet"
      >
        <View style={{ gap: theme.spacing.md, paddingBottom: theme.spacing.lg }}>
          <SettingsSection title={t('favorites.collections')}>
            {collections.map((collection) => (
              <SettingsRow
                key={collection.id}
                icon="folder-outline"
                title={collection.name}
                subtitle={tp('favorites.collectionCount', countFor(collection.id))}
                rightAccessory={
                  <View style={{ flexDirection: 'row', gap: theme.spacing.xs }}>
                    <IconButton
                      icon="create-outline"
                      size={36}
                      accessibilityLabel={t('favorites.collectionRename')}
                      testID={`rename-${collection.id}`}
                      onPress={() => {
                        setManageOpen(false);
                        setNameDraft(collection.name);
                        setNameSheet({ mode: 'rename', id: collection.id });
                      }}
                    />
                    <IconButton
                      icon="trash-outline"
                      size={36}
                      accessibilityLabel={t('favorites.collectionDelete')}
                      testID={`delete-${collection.id}`}
                      onPress={() => {
                        setManageOpen(false);
                        setPendingDelete(collection);
                      }}
                    />
                  </View>
                }
              />
            ))}
          </SettingsSection>
        </View>
      </BottomSheet>

      {/* Delete confirmation — honest about what is and is not removed */}
      <BottomSheet
        visible={pendingDelete !== null}
        onDismiss={() => setPendingDelete(null)}
        title={t('favorites.collectionDeleteConfirm')}
        subtitle={pendingDelete?.name}
        scrollable={false}
        testID="collection-delete-sheet"
      >
        <View style={{ gap: theme.spacing.md, paddingBottom: theme.spacing.lg }}>
          <AppText tone="muted" style={{ fontSize: 13, lineHeight: 21 }}>
            {t('favorites.collectionDeleteBody')}
          </AppText>
          <Button
            label={t('favorites.collectionDelete')}
            variant="destructive"
            onPress={() => void confirmDelete()}
          />
          <Button label={t('common.cancel')} variant="outline" onPress={() => setPendingDelete(null)} />
        </View>
      </BottomSheet>

      {/* Assign one favorite to collections */}
      <BottomSheet
        visible={assignFor !== null}
        onDismiss={() => setAssignFor(null)}
        title={t('favorites.addToCollection')}
        subtitle={assignFor?.dua.title ?? assignFor?.dua.text.split('\n')[0]}
        testID="collection-assign-sheet"
      >
        <View style={{ gap: theme.spacing.md, paddingBottom: theme.spacing.lg }}>
          {collections.length === 0 ? (
            <>
              <AppText tone="muted" style={{ fontSize: 13, lineHeight: 21 }}>
                {t('favorites.noCollectionsBody')}
              </AppText>
              <Button
                label={t('favorites.collectionCreate')}
                onPress={() => {
                  setAssignFor(null);
                  setNameDraft('');
                  setNameSheet({ mode: 'create' });
                }}
              />
            </>
          ) : (
            <SettingsSection title={t('favorites.collections')}>
              {collections.map((collection) => (
                <SettingsRow
                  key={collection.id}
                  icon="folder-outline"
                  title={collection.name}
                  subtitle={tp('favorites.collectionCount', countFor(collection.id))}
                  switchValue={(assignFor?.entry.collectionIds ?? []).includes(collection.id)}
                  onSwitchChange={(next) => {
                    if (assignFor) void toggleMembership(assignFor, collection, next);
                  }}
                  testID={`assign-row-${collection.id}`}
                />
              ))}
            </SettingsSection>
          )}
        </View>
      </BottomSheet>
    </Screen>
  );
}
