/**
 * DUAA — internationalization, public surface.
 *
 * Import from here in screens and components:
 *
 *   const { t, tp, isRTL, language } = useI18n();
 *   t('home.section.dailyDua')
 *   tp('search.resultsCount', results.length)
 *
 * Code outside React (services, AppError construction, share payloads) uses the
 * module functions `translate()` / `translatePlural()` from `./state`, which
 * read the language the settings store keeps in sync.
 *
 * NOTE: this barrel pulls in React and react-native (through the provider and
 * `./rtl`). Pure logic — unit tests, services, scripts — should deep-import
 * `@/core/i18n/state` or `@/core/i18n/plurals` instead.
 */

export type {
  AnyMessageKey,
  MessageCatalog,
  MessageKey,
  PluralForm,
  PluralMessageKey,
} from './messages/ar';
export { ar } from './messages/ar';
export { en } from './messages/en';
export { fr } from './messages/fr';

export { arabicPlural, englishPlural, frenchPlural, pluralForm, PLURAL_LANGUAGES } from './plurals';

export type { MessageParams, TextDirection } from './state';
export {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  catalogFor,
  directionFor,
  getDirection,
  getLanguage,
  hasMessage,
  interpolate,
  isSupportedLanguage,
  localeTagFor,
  normalizeLanguage,
  setLanguage,
  subscribeLanguage,
  t,
  tp,
  translate,
  translatePlural,
} from './state';

export type { I18nValue } from './I18nProvider';
export { I18nProvider, useI18n, useT, useTp } from './I18nProvider';

export {
  RTL,
  applyDocumentLocale,
  applyLanguagePreference,
  bootRTL,
  currentDirection,
  isRTL,
} from './rtl';

export type { LocalizedLanguageOption, LocalizedOption, Translate } from './options';
export {
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
} from './options';
