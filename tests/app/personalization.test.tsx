/**
 * Personalization — language, theme, home layout, collections.
 *
 * These are the behaviours the stage promises, exercised through the real
 * providers, stores and services (no component is mocked):
 *
 *   • switching language re-renders the tree immediately, flips `dir`/`lang` on
 *     the document, and persists — no restart, no reload;
 *   • palette / accent / appearance / font profile / reading size / density /
 *     card style all reach the composed theme;
 *   • the home screen renders exactly the user's `homeSections`, in order;
 *   • favorite collections can be created, assigned, filtered, renamed and
 *     deleted — and deleting one keeps the duas;
 *   • recently opened duas feed the home "recent" section.
 */

import { act, fireEvent, waitFor, within } from '@testing-library/react';

import HomeScreen from '@/app/(tabs)/index';
import FavoritesScreen from '@/app/favorites';
import LanguageScreen from '@/app/settings/language';
import PersonalizationScreen from '@/app/settings/personalization';
import HomeLayoutScreen from '@/app/settings/home';

import { useAppTheme } from '@/design/theme/ThemeProvider';
import type { Theme } from '@/design/theme/AppTheme';
import { I18nProvider, useI18n } from '@/core/i18n/I18nProvider';
import { getDirection, getLanguage, translate } from '@/core/i18n/state';
import { accentOptions, cardStyleOptions, paletteOptions, textSizeOptions } from '@/core/i18n/options';
import { useSettingsStore } from '@/store/settingsStore';
import { useFavoritesStore } from '@/store/favoritesStore';
import { useRecentDuasStore } from '@/store/recentDuasStore';
import { useContentStore } from '@/store/contentStore';
import { services } from '@/services/registry';
import { DUAS_BY_CATEGORY } from '@/data/content';
import { DEFAULT_PREFERENCES } from '@/core/types/domain';

import { renderScreen, settle, visibleText } from './helpers';

/** Reads the composed theme so tests can assert on real token values. */
function ThemeProbe({ onTheme }: { onTheme: (theme: Theme) => void }) {
  const theme = useAppTheme();
  onTheme(theme);
  return null;
}

function I18nProbe({ onValue }: { onValue: (value: ReturnType<typeof useI18n>) => void }) {
  const value = useI18n();
  onValue(value);
  return null;
}

/**
 * `react-native-web` renders a Switch as a `View` (which carries the
 * `role="switch"` from `accessibilityRole`) wrapping a visually hidden
 * `<input type="checkbox" role="switch">`. Only the input reacts to a click in
 * jsdom, so tests toggle the input, exactly like a screen reader or a keyboard
 * user would.
 */
function switchInside(element: Element): HTMLElement {
  const input = element.querySelector('input[role="switch"]');
  if (!input) throw new Error(`no switch inside ${element.getAttribute('data-testid')}`);
  return input as HTMLElement;
}

const RIZQ = DUAS_BY_CATEGORY.get('rizq')!;

beforeAll(async () => {
  await act(async () => {
    await useContentStore.getState().hydrate();
    await useFavoritesStore.getState().hydrate();
  });
  await settle();
});

beforeEach(async () => {
  await act(async () => {
    const store = useSettingsStore.getState();
    store.resetAppearancePreferences();
    store.resetHomeSections();
    store.setLanguage('ar');
    useRecentDuasStore.getState().clear();
    await useFavoritesStore.getState().clear();
  });
  await settle();
});

describe('language', () => {
  it('re-renders the home screen in French without a restart', async () => {
    const { container } = await renderScreen(<HomeScreen />);
    expect(visibleText(container)).toContain('السلام عليكم');

    await act(async () => {
      useSettingsStore.getState().setLanguage('fr');
    });
    await settle(2);

    const text = visibleText(container);
    expect(text).toContain('Assalamu alaikum');
    expect(text).toContain('Parcourir les invocations');
    expect(text).not.toContain('السلام عليكم');
  });

  it('flips the document direction and locale, and persists the choice', async () => {
    await act(async () => {
      useSettingsStore.getState().setLanguage('ar');
    });
    await settle();
    expect(document.documentElement.getAttribute('dir')).toBe('rtl');
    expect(document.documentElement.getAttribute('lang')).toBe('ar');
    expect(getDirection()).toBe('rtl');

    await act(async () => {
      const restartNeeded = useSettingsStore.getState().setLanguage('en');
      // On web the flip is immediate; only native needs a relaunch.
      expect(restartNeeded).toBe(false);
    });
    await settle();

    expect(document.documentElement.getAttribute('dir')).toBe('ltr');
    expect(document.documentElement.getAttribute('lang')).toBe('en');
    expect(getLanguage()).toBe('en');
    expect(useSettingsStore.getState().preferences.language).toBe('en');
    expect(useSettingsStore.getState().restartNeededForDirection).toBe(false);
  });

  it('exposes the direction to components through useI18n', async () => {
    const seen: string[] = [];
    const view = await renderScreen(
      <I18nProbe onValue={(value) => seen.push(`${value.language}:${value.direction}`)} />,
    );

    await act(async () => {
      useSettingsStore.getState().setLanguage('fr');
    });
    await settle(2);

    expect(seen[0]).toBe('ar:rtl');
    expect(seen[seen.length - 1]).toBe('fr:ltr');
    view.unmount();
  });

  it('changes language from the settings screen and says what happened', async () => {
    const view = await renderScreen(<LanguageScreen />, { path: '/settings/language' });
    expect(visibleText(view.container)).toContain('اللغة');

    await act(async () => {
      fireEvent.click(view.getByTestId('language-option-fr'));
    });
    await settle(2);

    expect(useSettingsStore.getState().preferences.language).toBe('fr');
    // The whole screen re-rendered in French, headers included.
    expect(visibleText(view.container)).toContain('Langue');
    view.unmount();
  });
});

describe('theme personalization', () => {
  /** One mounted probe; every preference change is read back from it. */
  async function mountProbe() {
    let theme!: Theme;
    const view = await renderScreen(<ThemeProbe onTheme={(next) => { theme = next; }} />);
    return { view, read: () => theme };
  }

  async function apply(probe: { read: () => Theme }, mutate: () => void): Promise<Theme> {
    await act(async () => {
      mutate();
    });
    await settle(2);
    return probe.read();
  }

  it('applies palette, accent, appearance and readability to the composed theme', async () => {
    const probe = await mountProbe();
    const base = probe.read();
    expect(base.colors.background).toBe('#F9F6EE');
    expect(base.preferences.palette).toBe('default');

    const midnight = await apply(probe, () => useSettingsStore.getState().setPalette('midnight'));
    expect(midnight.preferences.palette).toBe('midnight');
    expect(midnight.colors.background).not.toBe(base.colors.background);

    const sapphire = await apply(probe, () => useSettingsStore.getState().setAccent('sapphire'));
    expect(sapphire.colors.accent).not.toBe(midnight.colors.accent);

    const dark = await apply(probe, () => useSettingsStore.getState().setAppearance('dark'));
    expect(dark.scheme).toBe('dark');
    expect(dark.isDark).toBe(true);

    const readable = await apply(probe, () => useSettingsStore.getState().setHighReadability(true));
    expect(readable.preferences.highReadability).toBe(true);
    probe.view.unmount();

    await act(async () => {
      useSettingsStore.getState().resetAppearancePreferences();
    });
    await settle(2);
    expect(useSettingsStore.getState().preferences).toMatchObject({
      palette: DEFAULT_PREFERENCES.palette,
      accent: DEFAULT_PREFERENCES.accent,
      appearance: DEFAULT_PREFERENCES.appearance,
    });
  });

  it('applies font profile, reading size, density and card style', async () => {
    const probe = await mountProbe();
    const base = probe.read();

    const elegant = await apply(probe, () => useSettingsStore.getState().setFontProfile('elegant'));
    expect(elegant.preferences.fontProfile).toBe('elegant');
    // Headings move to the naskh face, body text keeps the sans face…
    expect(elegant.fontProfile.display.regular).toMatch(/Amiri/i);
    expect(elegant.fontProfile.display.regular).not.toBe(base.fontProfile.display.regular);
    expect(elegant.fontProfile.ui.regular).toBe(base.fontProfile.ui.regular);
    expect(elegant.fontProfile.sizeMultiplier).toBeGreaterThan(base.fontProfile.sizeMultiplier);
    // …and every face is Arabic-first, so shaping never breaks.
    expect(elegant.fontFamilies.scripture.regular).toMatch(/Amiri|Plex/i);
    expect(elegant.fontFamilies.ui.regular).toMatch(/Arabic/i);

    const large = await apply(probe, () => useSettingsStore.getState().setReadingScale('xLarge'));
    expect(large.readingScale).toBeGreaterThan(base.readingScale);
    expect(large.scripture().fontSize).toBeGreaterThan(base.scripture().fontSize);

    const spacious = await apply(probe, () => useSettingsStore.getState().setDensity('spacious'));
    expect(spacious.density.lineHeightScale).toBeGreaterThan(base.density.lineHeightScale);

    const glass = await apply(probe, () => useSettingsStore.getState().setCardStyle('glass'));
    expect(glass.card.id).toBe('glass');
    expect(glass.card.radius).not.toBe(base.card.radius);
    probe.view.unmount();
  });

  it('offers every theme and accent from the personalization screen', async () => {
    const view = await renderScreen(<PersonalizationScreen />, { path: '/settings/personalization' });

    // Every palette and every accent is reachable, by value and by name.
    for (const palette of paletteOptions(translate)) {
      expect(view.getByTestId(`personalization-palette-${palette.value}`).getAttribute('aria-label')).toBe(
        palette.label,
      );
    }
    for (const accent of accentOptions(translate)) {
      expect(view.queryByTestId(`personalization-accent-${accent.value}`)).toBeTruthy();
    }

    await act(async () => {
      fireEvent.click(view.getByTestId('personalization-palette-midnight'));
    });
    await settle(2);
    expect(useSettingsStore.getState().preferences.palette).toBe('midnight');

    await act(async () => {
      fireEvent.click(view.getByTestId(`personalization-accent-${accentOptions(translate)[4].value}`));
    });
    await settle(2);
    expect(useSettingsStore.getState().preferences.accent).toBe(accentOptions(translate)[4].value);

    // Text size is a segmented control: options are named, not test-ID'd.
    const sizes = textSizeOptions(translate);
    await act(async () => {
      fireEvent.click(view.getByLabelText(sizes[3].label));
    });
    await settle(2);
    expect(useSettingsStore.getState().preferences.readingScale).toBe('xLarge');

    const cards = cardStyleOptions(translate);
    await act(async () => {
      fireEvent.click(view.getByTestId(`personalization-card-style-${cards[3].value}`));
    });
    await settle(2);
    expect(useSettingsStore.getState().preferences.cardStyle).toBe('glass');
    view.unmount();
  });
});

describe('personalized home', () => {
  it('hides a section the user turned off', async () => {
    const { container } = await renderScreen(<HomeScreen />);
    expect(visibleText(container)).toContain('اختصارات');

    await act(async () => {
      useSettingsStore.getState().toggleHomeSection('quickActions');
    });
    await settle(2);

    expect(visibleText(container)).not.toContain('اختصارات');
    // The rest of the home screen is untouched.
    expect(visibleText(container)).toContain('دعاء اليوم');
  });

  it('refuses to hide the last visible section', async () => {
    await act(async () => {
      const store = useSettingsStore.getState();
      store.setHomeSections([
        { id: 'dailyDua', visible: true },
        { id: 'morning', visible: false },
        { id: 'evening', visible: false },
        { id: 'tasbeeh', visible: false },
        { id: 'favorites', visible: false },
        { id: 'recent', visible: false },
        { id: 'community', visible: false },
        { id: 'quickActions', visible: false },
      ]);
      useSettingsStore.getState().toggleHomeSection('dailyDua');
    });
    await settle();

    const visible = useSettingsStore.getState().preferences.homeSections.filter((s) => s.visible);
    expect(visible.map((section) => section.id)).toEqual(['dailyDua']);
  });

  it('renders the sections in the order the user arranged', async () => {
    const { container } = await renderScreen(<HomeScreen />);

    await act(async () => {
      const store = useSettingsStore.getState();
      // Move tasbeeh to the very top, one step at a time (the real control).
      store.moveHomeSection('tasbeeh', -1);
      useSettingsStore.getState().moveHomeSection('tasbeeh', -1);
      useSettingsStore.getState().moveHomeSection('tasbeeh', -1);
      useSettingsStore.getState().moveHomeSection('tasbeeh', -1);
    });
    await settle(2);

    expect(useSettingsStore.getState().preferences.homeSections[0].id).toBe('tasbeeh');
    const order = [...container.querySelectorAll('[data-testid]')]
      .map((node) => node.getAttribute('data-testid'))
      .filter((id): id is string => Boolean(id));
    expect(order.indexOf('home-tasbeeh')).toBeLessThan(order.indexOf('daily-dua-card'));
  });

  it('hides, shows and reorders sections from the home layout screen', async () => {
    const { getByTestId, getByLabelText } = await renderScreen(<HomeLayoutScreen />, { path: '/settings/home' });

    // Hide the evening entry with the real switch…
    await act(async () => {
      fireEvent.click(switchInside(getByTestId('home-section-toggle-evening')));
    });
    await settle(2);
    expect(
      useSettingsStore.getState().preferences.homeSections.find((section) => section.id === 'evening')?.visible,
    ).toBe(false);

    // …and bring it back from the hidden list.
    await act(async () => {
      fireEvent.click(switchInside(getByTestId('home-section-hidden-evening')));
    });
    await settle(2);
    expect(
      useSettingsStore.getState().preferences.homeSections.find((section) => section.id === 'evening')?.visible,
    ).toBe(true);
    expect(getByTestId('home-section-up-evening')).toBeTruthy();
  });

  it('lists recently opened duas, and says so honestly when there are none', async () => {
    const empty = await renderScreen(<HomeScreen />);
    expect(empty.queryByTestId('home-recent-empty')).toBeTruthy();
    expect(visibleText(empty.container)).toContain('لم تفتح أي دعاء بعد');
    empty.unmount();

    await act(async () => {
      useRecentDuasStore.getState().record(RIZQ[1].id);
      useRecentDuasStore.getState().record(RIZQ[0].id);
    });

    const { container, queryByTestId } = await renderScreen(<HomeScreen />);
    await settle(2);
    expect(queryByTestId('home-recent-empty')).toBeNull();
    const text = visibleText(container);
    expect(text).toContain('قرأتها مؤخرًا');
    // Most recently opened first.
    expect(text.indexOf(RIZQ[0].text.slice(0, 12))).toBeLessThan(text.indexOf(RIZQ[1].text.slice(0, 12)));
  });
});

describe('favorite collections', () => {
  async function seedFavorite(duaId: string) {
    await act(async () => {
      await useFavoritesStore.getState().toggle(duaId);
    });
    await settle(2);
  }

  it('creates a collection, assigns a dua to it and filters by it', async () => {
    await seedFavorite(RIZQ[0].id);
    await seedFavorite(RIZQ[1].id);

    const view = await renderScreen(<FavoritesScreen />, { path: '/favorites' });
    await settle(2);
    expect(visibleText(view.container)).toContain('لا مجموعات بعد');

    // Create
    await act(async () => {
      fireEvent.click(view.getByTestId('collection-create'));
    });
    await settle(2);
    await act(async () => {
      fireEvent.change(view.getByTestId('collection-name-field'), { target: { value: 'أدعية الرزق' } });
    });
    await settle();
    await act(async () => {
      fireEvent.click(view.getByLabelText('إنشاء'));
    });
    await settle(3);

    const collections = useFavoritesStore.getState().collections;
    expect(collections).toHaveLength(1);
    expect(collections[0].name).toBe('أدعية الرزق');
    expect(visibleText(view.container)).toContain('أدعية الرزق');

    // Assign the first favorite
    await act(async () => {
      fireEvent.click(view.getByTestId(`assign-${RIZQ[0].id}`));
    });
    await settle(2);
    await act(async () => {
      fireEvent.click(switchInside(view.getByTestId(`assign-row-${collections[0].id}`)));
    });
    await settle(3);

    await waitFor(() => {
      const entry = useFavoritesStore.getState().entries.find((item) => item.duaId === RIZQ[0].id);
      expect(entry?.collectionIds).toEqual([collections[0].id]);
    });

    // Filter by the collection: only the assigned dua remains
    await act(async () => {
      fireEvent.click(view.getByTestId(`collection-${collections[0].id}`));
    });
    await settle(2);

    expect(view.getByTestId(`favorite-${RIZQ[0].id}`)).toBeTruthy();
    expect(view.queryByTestId(`favorite-${RIZQ[1].id}`)).toBeNull();
  });

  it('rejects an empty name and a duplicate name with an honest message', async () => {
    await act(async () => {
      await useFavoritesStore.getState().createCollection('الصباح');
    });
    await settle(2);

    const empty = await useFavoritesStore.getState().createCollection('   ');
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(empty.error.userMessage).toBe('اكتب اسمًا للمجموعة.');

    const duplicate = await useFavoritesStore.getState().createCollection('الصباح');
    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) expect(duplicate.error.userMessage).toBe('توجد مجموعة بهذا الاسم بالفعل.');

    const tooLong = await useFavoritesStore.getState().createCollection('ا'.repeat(31));
    expect(tooLong.ok).toBe(false);
    if (!tooLong.ok) expect(tooLong.error.userMessage).toContain('طويل جدًا');
  });

  it('renames a collection and keeps its members', async () => {
    await seedFavorite(RIZQ[0].id);
    await act(async () => {
      await useFavoritesStore.getState().createCollection('قبل');
    });
    const id = useFavoritesStore.getState().collections[0].id;
    await act(async () => {
      await useFavoritesStore.getState().setEntryCollections(RIZQ[0].id, [id]);
      await useFavoritesStore.getState().renameCollection(id, 'بعد');
    });
    await settle(2);

    expect(useFavoritesStore.getState().collections[0].name).toBe('بعد');
    expect(useFavoritesStore.getState().entries[0].collectionIds).toEqual([id]);
  });

  it('deleting a collection keeps the favorites inside it', async () => {
    await seedFavorite(RIZQ[0].id);
    await act(async () => {
      await useFavoritesStore.getState().createCollection('مؤقتة');
    });
    const id = useFavoritesStore.getState().collections[0].id;
    await act(async () => {
      await useFavoritesStore.getState().setEntryCollections(RIZQ[0].id, [id]);
    });

    const view = await renderScreen(<FavoritesScreen />, { path: '/favorites' });
    await settle(2);
    expect(view.getByTestId(`favorite-${RIZQ[0].id}`)).toBeTruthy();

    await act(async () => {
      fireEvent.click(view.getByTestId('collection-manage'));
    });
    await settle(2);
    await act(async () => {
      fireEvent.click(view.getByTestId(`delete-${id}`));
    });
    await settle(2);
    await act(async () => {
      fireEvent.click(view.getByLabelText('حذف المجموعة'));
    });
    await settle(3);

    expect(useFavoritesStore.getState().collections).toEqual([]);
    // The dua is still a favorite — only the folder went away.
    expect(useFavoritesStore.getState().has(RIZQ[0].id)).toBe(true);
    expect(view.getByTestId(`favorite-${RIZQ[0].id}`)).toBeTruthy();
  });

  it('searches and sorts inside the saved set', async () => {
    await seedFavorite(RIZQ[0].id);
    await seedFavorite(DUAS_BY_CATEGORY.get('morning')![0].id);

    const view = await renderScreen(<FavoritesScreen />, { path: '/favorites' });
    await settle(2);
    expect(view.getByTestId(`favorite-${RIZQ[0].id}`)).toBeTruthy();

    await act(async () => {
      fireEvent.change(view.getByLabelText('حقل البحث في المفضلة'), {
        target: { value: RIZQ[0].text.slice(2, 8) },
      });
    });
    await settle(3);

    expect(view.getByTestId(`favorite-${RIZQ[0].id}`)).toBeTruthy();
    expect(view.queryByTestId(`favorite-${DUAS_BY_CATEGORY.get('morning')![0].id}`)).toBeNull();

    await act(async () => {
      fireEvent.change(view.getByLabelText('حقل البحث في المفضلة'), { target: { value: 'zzzz' } });
    });
    await settle(3);
    expect(visibleText(view.container)).toContain('لا نتائج في المفضلة');
  });

  it('reports where favorites live while no backend exists', async () => {
    expect(services.favorites().isSynced).toBe(false);
    const view = await renderScreen(<FavoritesScreen />, { path: '/favorites' });
    await settle(2);
    // Two saved duas are described with the correct Arabic plural.
    await act(async () => {
      await useFavoritesStore.getState().toggle(RIZQ[0].id);
      await useFavoritesStore.getState().toggle(RIZQ[1].id);
    });
    await settle(2);
    expect(visibleText(view.container)).toContain('دعاءان محفوظان');
  });
});

describe('preferences as one system', () => {
  it('keeps every preference in the single persisted object', async () => {
    await act(async () => {
      const store = useSettingsStore.getState();
      store.setLanguage('fr');
      store.setPalette('rose');
      store.setAccent('teal');
      store.setReadingScale('large');
      store.setDensity('compact');
      store.setCardStyle('minimal');
      store.setFontProfile('classic');
      store.setHighReadability(true);
      store.setMotion('off');
      store.toggleHomeSection('community');
      store.setWidgetContent('tasbeeh');
      store.setWidgetSize('small');
    });
    await settle(2);

    expect(useSettingsStore.getState().preferences).toMatchObject({
      language: 'fr',
      palette: 'rose',
      accent: 'teal',
      readingScale: 'large',
      density: 'compact',
      cardStyle: 'minimal',
      fontProfile: 'classic',
      highReadability: true,
      motion: 'off',
      widgetContent: 'tasbeeh',
      widgetSize: 'small',
    });
    const persisted = useSettingsStore.persist.getOptions().partialize?.(useSettingsStore.getState());
    expect(Object.keys(persisted ?? {})).toEqual(['preferences']);
  });

  it('says honestly that preferences are stored locally until a backend exists', async () => {
    await act(async () => {
      const state = await useSettingsStore.getState().syncPreferences();
      expect(state).toBe('local');
    });
    expect(useSettingsStore.getState().syncState).toBe('local');
    expect(services.auth().isConfigured).toBe(false);
  });
});
