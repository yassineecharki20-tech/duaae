/**
 * Internationalization — the translation system itself.
 *
 * Three guarantees matter here:
 *   1. Arabic is the default for anyone without a stored preference, and it is
 *      the fallback whenever a key is missing in French/English.
 *   2. The catalogs stay in sync: no key can exist in French or English without
 *      existing in Arabic, placeholders must match, and the only keys Arabic may
 *      have extra are CLDR plural forms.
 *   3. Everything a picker renders comes from a catalog through a `t` function,
 *      so switching language updates the labels instead of freezing them.
 */

import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  catalogFor,
  directionFor,
  getDirection,
  getLanguage,
  hasMessage,
  interpolate,
  localeTagFor,
  normalizeLanguage,
  setLanguage,
  subscribeLanguage,
  translate,
  translatePlural,
} from '@/core/i18n/state';
import { arabicPlural, englishPlural, frenchPlural, pluralForm } from '@/core/i18n/plurals';
import type { LocalizedOption, Translate } from '@/core/i18n/options';
import {
  accentOptions,
  appearanceOptions,
  cardStyleOptions,
  densityOptions,
  fontProfileOptions,
  homeSectionLabel,
  homeSectionOptions,
  languageOptions,
  motionOptions,
  paletteOptions,
  textSizeOptions,
  widgetContentOptions,
} from '@/core/i18n/options';
import { ar } from '@/core/i18n/messages/ar';
import { en } from '@/core/i18n/messages/en';
import { fr } from '@/core/i18n/messages/fr';
import { ALL_DUAS } from '@/data/content';
import {
  ACCENT_COLOR_IDS,
  APP_LANGUAGES,
  DEFAULT_APP_LANGUAGE,
  HOME_SECTION_IDS,
  THEME_PALETTE_IDS,
} from '@/core/types/domain';

const CATALOGS = { ar, fr, en } as const;
const PLURAL_SUFFIXES = ['.zero', '.one', '.two', '.few', '.many'] as const;

/** Catalogs are typed maps; tests read them by arbitrary key. */
function keysOf(catalog: object): string[] {
  return Object.keys(catalog);
}

function valueOf(catalog: object, key: string): string {
  return (catalog as Record<string, string>)[key];
}

function placeholders(value: string): string[] {
  return [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
}

afterEach(() => {
  setLanguage('ar');
});

describe('language defaults and direction', () => {
  it('defaults to Arabic when nothing is stored', () => {
    expect(DEFAULT_APP_LANGUAGE).toBe('ar');
    expect(DEFAULT_LANGUAGE).toBe('ar');
    expect(getLanguage()).toBe('ar');
    expect(translate('common.save')).toBe(valueOf(ar, 'common.save'));
  });

  it('maps Arabic to RTL and French/English to LTR', () => {
    expect(directionFor('ar')).toBe('rtl');
    expect(directionFor('fr')).toBe('ltr');
    expect(directionFor('en')).toBe('ltr');
    expect(getDirection()).toBe('rtl');
  });

  it('exposes a real locale tag per language for date/number formatting', () => {
    for (const language of APP_LANGUAGES) {
      expect(localeTagFor(language)).toMatch(/^[a-z]{2}(-[A-Za-z0-9]+)*$/);
    }
    expect(new Date('2026-09-12T12:00:00Z').toLocaleDateString(localeTagFor('fr'), { month: 'long' }))
      .not.toEqual(new Date('2026-09-12T12:00:00Z').toLocaleDateString(localeTagFor('ar'), { month: 'long' }));
  });

  it('normalizes anything unsupported back to Arabic', () => {
    expect(normalizeLanguage('de')).toBe('ar');
    expect(normalizeLanguage(undefined)).toBe('ar');
    expect(normalizeLanguage(null)).toBe('ar');
    expect(normalizeLanguage(42)).toBe('ar');
    expect(normalizeLanguage('fr')).toBe('fr');
    expect(SUPPORTED_LANGUAGES).toEqual([...APP_LANGUAGES]);
  });

  it('switches language at runtime and notifies subscribers', () => {
    const seen: string[] = [];
    const unsubscribe = subscribeLanguage((language) => seen.push(language));

    expect(setLanguage('fr')).toBe('fr');
    expect(getLanguage()).toBe('fr');
    expect(translate('common.save')).toBe(valueOf(fr, 'common.save'));
    expect(getDirection()).toBe('ltr');

    expect(setLanguage('en')).toBe('en');
    expect(translate('common.save')).toBe(valueOf(en, 'common.save'));

    unsubscribe();
    setLanguage('ar');
    expect(seen).toEqual(['fr', 'en']);
  });

  it('setting the same language twice is a no-op for subscribers', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeLanguage(listener);
    setLanguage('fr');
    setLanguage('fr');
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });
});

describe('catalog integrity', () => {
  it('has the same keys in French and English, all present in Arabic', () => {
    const arabicKeys = new Set(keysOf(ar));
    for (const language of ['fr', 'en'] as const) {
      const missing = keysOf(CATALOGS[language]).filter((key) => !arabicKeys.has(key));
      expect({ language, missing }).toEqual({ language, missing: [] });
    }
    expect(keysOf(fr).sort()).toEqual(keysOf(en).sort());
  });

  it('only allows Arabic to have extra CLDR plural forms', () => {
    const frenchKeys = new Set(keysOf(fr));
    const extras = keysOf(ar).filter((key) => !frenchKeys.has(key));

    expect(extras.length).toBeGreaterThan(0); // Arabic plurals are real, not accidental
    for (const key of extras) {
      const suffix = PLURAL_SUFFIXES.find((candidate) => key.endsWith(candidate));
      const base = suffix ? key.slice(0, -suffix.length) : null;
      expect({ key, hasPluralSuffix: Boolean(suffix), baseExistsInFrench: base ? frenchKeys.has(base) : false })
        .toEqual({ key, hasPluralSuffix: true, baseExistsInFrench: true });
    }
  });

  it('has no empty values anywhere', () => {
    for (const [language, catalog] of Object.entries(CATALOGS)) {
      const empty = Object.entries(catalog as Record<string, string>)
        .filter(([, value]) => typeof value !== 'string' || value.trim().length === 0)
        .map(([key]) => key);
      expect({ language, empty }).toEqual({ language, empty: [] });
    }
  });

  it('uses the same placeholders in every language', () => {
    // `{count}` may differ: Arabic spells small numbers out as words ("دعاءان"),
    // while French and English keep the digit. Every *named* placeholder, though,
    // has to exist in all three or the sentence silently loses information.
    const mismatches: string[] = [];
    for (const key of keysOf(fr)) {
      const reference = placeholders(valueOf(ar, key)).filter((name) => name !== 'count');
      for (const language of ['fr', 'en'] as const) {
        const actual = placeholders(valueOf(CATALOGS[language], key)).filter((name) => name !== 'count');
        if (actual.join(',') !== reference.join(',')) {
          mismatches.push(`${language}:${key} [${actual.join('|')}] != [${reference.join('|')}]`);
        }
      }
    }
    expect(mismatches).toEqual([]);
  });

  it('interpolates params and leaves unknown placeholders alone', () => {
    expect(interpolate('a {x} b', { x: 1 })).toBe('a 1 b');
    expect(interpolate('a {x} b')).toBe('a {x} b');
    expect(translate('home.libraryFootnote', { count: 147 })).toContain('147');
  });

  it('falls back to Arabic, then to the key, when a translation is missing', () => {
    expect(hasMessage('common.save', 'fr')).toBe(true);
    expect(hasMessage('common.doesNotExist', 'fr')).toBe(false);
    // @ts-expect-error — deliberately asking for a key no catalog has
    expect(translate('common.doesNotExist')).toBe('common.doesNotExist');
    // A plural form only Arabic declares still resolves for French via the base key.
    expect(translatePlural('home.favoritesCount', 3, undefined, 'fr')).toBe(
      interpolate(valueOf(fr, 'home.favoritesCount'), { count: 3 }),
    );
  });

  it('never carries translated scripture — Arabic appears in fr/en only where it must', () => {
    // Policy: dua and azkar texts are never translated, so the reader renders
    // `dua.text` from the data layer. A handful of strings keep Arabic on
    // purpose in every language, and this list is the whole of them:
    const intentionallyArabic: Record<string, string> = {
      'app.nameFull': 'brand name',
      'share.branding': 'signature on shared cards',
      'tasbeeh.customPlaceholder': 'dhikr example — scripture is never translated',
      'settings.appearance.previewText': 'Arabic shaping preview for the font/reading pickers',
      'settings.language.native.ar': 'native name of Arabic',
      'prefs.language.ar': 'native name of Arabic',
    };

    for (const language of ['fr', 'en'] as const) {
      const catalog = CATALOGS[language];
      const withArabic = keysOf(catalog)
        .filter((key) => /[\u0600-\u06FF]/.test(valueOf(catalog, key)))
        .sort();
      expect({ language, withArabic }).toEqual({
        language,
        withArabic: Object.keys(intentionallyArabic).sort(),
      });
    }

    // And no catalog holds a supplication body: scripture lives in src/data only.
    // (`settings.appearance.previewText` quotes one verse on purpose, to let the
    // user judge Arabic shaping in the font/reading pickers — excluded here.)
    const haystack = keysOf(ar)
      .filter((key) => key !== 'settings.appearance.previewText')
      .map((key) => valueOf(ar, key))
      .join('\u0000');
    const leaked = ALL_DUAS.filter((dua) => haystack.includes(dua.text.slice(0, 40))).map((dua) => dua.id);
    expect(leaked).toEqual([]);
  });
});

describe('plural rules', () => {
  it('follows CLDR for Arabic', () => {
    expect(arabicPlural(0)).toBe('zero');
    expect(arabicPlural(1)).toBe('one');
    expect(arabicPlural(2)).toBe('two');
    expect(arabicPlural(3)).toBe('few');
    expect(arabicPlural(10)).toBe('few');
    expect(arabicPlural(11)).toBe('many');
    expect(arabicPlural(99)).toBe('many');
    expect(arabicPlural(100)).toBe('other');
    expect(arabicPlural(103)).toBe('few');
    expect(arabicPlural(111)).toBe('many');
  });

  it('follows CLDR for French and English', () => {
    expect(frenchPlural(0)).toBe('one');
    expect(frenchPlural(1)).toBe('one');
    expect(frenchPlural(2)).toBe('other');
    expect(englishPlural(0)).toBe('other');
    expect(englishPlural(1)).toBe('one');
    expect(englishPlural(2)).toBe('other');
    expect(pluralForm('ar', 2)).toBe('two');
    expect(pluralForm('fr', 2)).toBe('other');
    expect(pluralForm('en', 2)).toBe('other');
  });

  it('renders the right Arabic form for each count', () => {
    expect(translatePlural('home.favoritesCount', 0)).toBe(valueOf(ar, 'home.favoritesCount.zero'));
    expect(translatePlural('home.favoritesCount', 1)).toBe(valueOf(ar, 'home.favoritesCount.one'));
    expect(translatePlural('home.favoritesCount', 2)).toBe(valueOf(ar, 'home.favoritesCount.two'));
    expect(translatePlural('home.favoritesCount', 4)).toBe(
      interpolate(valueOf(ar, 'home.favoritesCount.few'), { count: 4 }),
    );
    expect(translatePlural('home.favoritesCount', 14)).toBe(
      interpolate(valueOf(ar, 'home.favoritesCount.many'), { count: 14 }),
    );
  });

  it('keeps the community promise in the user’s own words', () => {
    expect(valueOf(ar, 'community.comingSoon')).toBe('المجتمع قريبًا');
    expect(valueOf(fr, 'community.comingSoon')).toBe('La communauté arrive bientôt.');
    expect(valueOf(en, 'community.comingSoon')).toBe('Community is coming soon.');
  });
});

describe('localized option builders', () => {
  const builders: Record<string, (t: Translate) => readonly LocalizedOption<string>[]> = {
    appearance: appearanceOptions,
    motion: motionOptions,
    textSize: textSizeOptions,
    density: densityOptions,
    cardStyle: cardStyleOptions,
    palette: paletteOptions,
    accent: accentOptions,
    fontProfile: fontProfileOptions,
    widget: widgetContentOptions,
    homeSection: homeSectionOptions,
  } as const;

  it('returns a translated label for every option in every language', () => {
    for (const [name, build] of Object.entries(builders)) {
      for (const language of APP_LANGUAGES) {
        const options = build((key, params) => translate(key, params, language));
        expect(options.length).toBeGreaterThan(0);
        for (const option of options) {
          expect({ name, language, option }).toEqual({
            name,
            language,
            option: { ...option, label: expect.any(String) },
          });
          expect(option.label.trim().length).toBeGreaterThan(0);
          // No label may leak a raw key or an unfilled placeholder.
          expect(option.label).not.toMatch(/[{}]/);
          expect(option.label).not.toMatch(/^[a-z]+\.[a-z]/);
        }
      }
    }
  });

  it('produces different labels per language (nothing is frozen at import)', () => {
    const arabic = paletteOptions((key, params) => translate(key, params, 'ar')).map((o) => o.label);
    const french = paletteOptions((key, params) => translate(key, params, 'fr')).map((o) => o.label);
    expect(arabic).not.toEqual(french);
  });

  it('covers every palette, accent and home section the settings screen offers', () => {
    const palettes = paletteOptions((key) => translate(key)).map((option) => option.value);
    expect(palettes.sort()).toEqual([...THEME_PALETTE_IDS].sort());

    const accents = accentOptions((key) => translate(key)).map((option) => option.value);
    expect(accents.sort()).toEqual([...ACCENT_COLOR_IDS].sort());

    const sections = homeSectionOptions((key) => translate(key)).map((option) => option.value);
    expect(sections.sort()).toEqual([...HOME_SECTION_IDS].sort());
    expect(homeSectionLabel((key) => translate(key), 'dailyDua')).toBe(valueOf(ar, 'home.section.dailyDua'));
  });

  it('lists the three languages with their native names', () => {
    const options = languageOptions((key, params) => translate(key, params));
    expect(options.map((option) => option.value)).toEqual([...APP_LANGUAGES]);
    for (const option of options) {
      expect(option.label.length).toBeGreaterThan(1);
      expect(option.direction).toBe(directionFor(option.value));
    }
  });

  it('serves whole catalogs for screens that need to iterate them', () => {
    expect(valueOf(catalogFor('fr'), 'common.save')).toBe(valueOf(fr, 'common.save'));
    expect(valueOf(catalogFor('en'), 'common.save')).toBe(valueOf(en, 'common.save'));
    // An unknown language falls back to Arabic rather than rendering keys.
    expect(valueOf(catalogFor('de' as never), 'common.save')).toBe(valueOf(ar, 'common.save'));
  });
});
