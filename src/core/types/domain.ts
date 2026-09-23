/**
 * DUAA — Domain types.
 *
 * These describe the product, not the backend. Firestore documents will be
 * mapped *into* these shapes by the repository layer so the UI never learns
 * anything Firebase-specific.
 */

/* ------------------------------------------------------------------ */
/* Content                                                             */
/* ------------------------------------------------------------------ */

/** Where a piece of religious text comes from. Never invented — see docs/CONTENT-POLICY.md. */
export interface SourceReference {
  /** Printed collection, e.g. `صحيح البخاري`, `حصن المسلم`. */
  book: string;
  /** Number inside that collection, when it is confidently known. */
  number?: string;
  /** Companion / narrator chain entry, when applicable. */
  narrator?: string;
  /** Grading such as `صحيح` or `حسن`. */
  grade?: string;
  /** Quranic citation for verses used as duʿāʾ. */
  quran?: { surah: string; ayah: string };
}

export type CategoryKind = 'session' | 'collection';

export interface DuaCategory {
  id: string;
  title: string;
  subtitle: string;
  /** Icon name resolved by `<CategoryGlyph/>`. */
  icon: string;
  kind: CategoryKind;
  /** Present when `kind === 'session'`; enables repetition tracking. */
  sessionKey?: AzkarSessionKey;
  order: number;
  /** Number of items — filled in by the content repository, not hardcoded. */
  itemCount?: number;
}

export interface Dua {
  id: string;
  categoryId: string;
  /** Short human label, e.g. `سيد الاستغفار`. Optional. */
  title?: string;
  /** The supplication itself. */
  text: string;
  /** Benefit/virtue reported by the same source. Optional, never invented. */
  virtue?: string;
  /** How many times it is reported to be repeated. Defaults to 1. */
  repeat: number;
  sources: SourceReference[];
  /** Extra terms used by search (kept in the data layer, not the UI). */
  keywords: string[];
  order: number;
}

export type AzkarSessionKey = 'morning' | 'evening' | 'sleep';

export interface AzkarSession {
  key: AzkarSessionKey;
  title: string;
  subtitle: string;
  categoryId: string;
  /** Local hour window in which the session is "current", used for home hints. */
  windowStartHour: number;
  windowEndHour: number;
}

/* ------------------------------------------------------------------ */
/* Tasbeeh                                                             */
/* ------------------------------------------------------------------ */

export interface Dhikr {
  id: string;
  label: string;
  /** Presets ship with the app; custom dhikr live only in local storage. */
  isPreset: boolean;
  /** Optional source note for preset phrases. */
  note?: string;
}

export interface TasbeehProgress {
  dhikrId: string;
  /** Count within the current round. */
  count: number;
  /** Target that completes a round. */
  target: number;
  /** Rounds completed for this dhikr. */
  rounds: number;
  /** Lifetime total for this dhikr. */
  total: number;
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/* Favorites                                                           */
/* ------------------------------------------------------------------ */

export interface FavoriteEntry {
  duaId: string;
  addedAt: string;
  /** Kept so the list can render before content resolves. */
  note?: string;
}

/* ------------------------------------------------------------------ */
/* Identity & accounts                                                 */
/* ------------------------------------------------------------------ */

export type AuthProvider = 'email' | 'google' | 'apple' | 'anonymous';

/**
 * `unavailable` is a first-class state: it means "no auth backend has been
 * configured for this build", which is the honest state of this stage. The UI
 * renders an explanatory panel rather than a fake sign-in.
 */
export type AuthStatus =
  | 'unknown'
  | 'unauthenticated'
  | 'authenticating'
  | 'authenticated'
  | 'unavailable'
  | 'error';

export interface AppUser {
  uid: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
  emailVerified: boolean;
  provider: AuthProvider;
  createdAt: string;
}

export interface LocalProfile {
  /** Display name the user chooses for themselves; stored on-device only. */
  displayName: string;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

export type ReminderChannel = 'morning' | 'evening' | 'dailyDua' | 'tasbeeh' | 'custom';

export interface ReminderSetting {
  channel: ReminderChannel;
  label: string;
  description: string;
  enabled: boolean;
  /** `HH:mm` in 24h local time. */
  time: string;
}

export type NotificationPermissionStatus = 'unknown' | 'granted' | 'denied' | 'unavailable';

export interface NotificationPreferences {
  reminders: Record<ReminderChannel, ReminderSetting>;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  permissionStatus: NotificationPermissionStatus;
}

/* ------------------------------------------------------------------ */
/* Community (foundation — no backend in this stage)                   */
/* ------------------------------------------------------------------ */

export interface CommunityAuthor {
  uid: string;
  displayName: string;
  photoURL?: string;
}

export interface CommunityPost {
  id: string;
  author: CommunityAuthor;
  /** Free text shared by the author. */
  body: string;
  /** Optional dua the post is about. */
  duaId?: string;
  createdAt: string;
  likeCount: number;
  likedByMe: boolean;
  savedByMe: boolean;
}

export type ReportReason =
  | 'incorrect-religious-content'
  | 'inappropriate'
  | 'spam'
  | 'harassment'
  | 'other';

export interface ReportPayload {
  targetType: 'post' | 'profile';
  targetId: string;
  reason: ReportReason;
  details?: string;
}

/* ------------------------------------------------------------------ */
/* App-level state                                                     */
/* ------------------------------------------------------------------ */

export type AppearanceMode = 'system' | 'light' | 'dark';
/**
 * Interface language. Arabic is the product's first language and the default
 * for anyone without a stored preference; French and English translate the
 * interface only (see docs/CONTENT-POLICY.md).
 */
export type AppLanguage = 'ar' | 'fr' | 'en';
export const APP_LANGUAGES = ['ar', 'fr', 'en'] as const satisfies readonly AppLanguage[];
/** Default for a first launch with no persisted preference. */
export const DEFAULT_APP_LANGUAGE: AppLanguage = 'ar';
export type MotionPreference = 'system' | 'on' | 'off';

/**
 * @deprecated Flat settings shape from before preferences were unified. Kept
 * only so the v1 → v2 migration stays typed; new code uses `AppPreferences`.
 */
export type SettingsState = LegacySettingsPayload;

/* ------------------------------------------------------------------ */
/* Preferences — one structured object for every user choice            */
/* ------------------------------------------------------------------ */

/**
 * Colour palette. `default` is the shipped design (emerald primary, ivory
 * surface, night text) — the other palettes are derived from seeds in
 * `src/design/tokens/colorMath.ts` and re-derived for dark mode, so nothing
 * here hardcodes a hex value.
 */
export type ThemePaletteId =
  | 'default'
  | 'emerald'
  | 'midnight'
  | 'sand'
  | 'ocean'
  | 'forest'
  | 'rose'
  | 'monochrome';

export const THEME_PALETTE_IDS = [
  'default',
  'emerald',
  'midnight',
  'sand',
  'ocean',
  'forest',
  'rose',
  'monochrome',
] as const satisfies readonly ThemePaletteId[];

/** Accent used for secondary buttons, links and badges. Readable on both modes. */
export type AccentColorId =
  | 'gold'
  | 'emerald'
  | 'copper'
  | 'teal'
  | 'sapphire'
  | 'rose'
  | 'sand'
  | 'slate';

export const ACCENT_COLOR_IDS = [
  'gold',
  'emerald',
  'copper',
  'teal',
  'sapphire',
  'rose',
  'sand',
  'slate',
] as const satisfies readonly AccentColorId[];

/** Typography profile. Every profile keeps Arabic shaping intact. */
export type FontProfileId = 'default' | 'elegant' | 'modern' | 'classic';

export const FONT_PROFILE_IDS = ['default', 'elegant', 'modern', 'classic'] as const satisfies readonly FontProfileId[];

/** Line and paragraph spacing inside dua and adhkar text. */
export type ReadingDensity = 'compact' | 'comfortable' | 'spacious';

export const READING_DENSITIES = ['compact', 'comfortable', 'spacious'] as const satisfies readonly ReadingDensity[];

/** Dua card treatment. */
export type CardStyleId = 'minimal' | 'rounded' | 'elegant' | 'glass' | 'classic';

export const CARD_STYLE_IDS = ['minimal', 'rounded', 'elegant', 'glass', 'classic'] as const satisfies readonly CardStyleId[];

/** What the (future) home-screen widget will show. Stored now, used later. */
export type WidgetContentId = 'dailyDua' | 'tasbeeh' | 'azkar';

export const WIDGET_CONTENT_IDS = ['dailyDua', 'tasbeeh', 'azkar'] as const satisfies readonly WidgetContentId[];

export type WidgetSizeId = 'small' | 'medium';

export const WIDGET_SIZE_IDS = ['small', 'medium'] as const satisfies readonly WidgetSizeId[];

/** Sections the home screen can render, in the order the user arranges them. */
export type HomeSectionId =
  | 'dailyDua'
  | 'morning'
  | 'evening'
  | 'tasbeeh'
  | 'favorites'
  | 'recent'
  | 'community'
  | 'quickActions';

export const HOME_SECTION_IDS = [
  'dailyDua',
  'morning',
  'evening',
  'tasbeeh',
  'favorites',
  'recent',
  'community',
  'quickActions',
] as const satisfies readonly HomeSectionId[];

export interface HomeSectionPreference {
  readonly id: HomeSectionId;
  readonly visible: boolean;
}

/** The single preferences object: persisted once, read everywhere. */
export interface AppPreferences {
  /** Interface language. Arabic for anyone without a stored preference. */
  readonly language: AppLanguage;
  /** Light/dark/system. */
  readonly appearance: AppearanceMode;
  readonly palette: ThemePaletteId;
  readonly accent: AccentColorId;
  readonly fontProfile: FontProfileId;
  /** Text size for dua and reading surfaces (S/M/L/XL). */
  readonly readingScale: import('@/design/tokens/typography').ReadingScale;
  readonly density: ReadingDensity;
  readonly cardStyle: CardStyleId;
  /** Higher contrast text and firmer borders. */
  readonly highReadability: boolean;
  readonly motion: MotionPreference;
  readonly soundEnabled: boolean;
  readonly hapticsEnabled: boolean;
  /** Home sections, in display order, with visibility. */
  readonly homeSections: readonly HomeSectionPreference[];
  readonly widgetContent: WidgetContentId;
  readonly widgetSize: WidgetSizeId;
}

/** Default home layout: every section visible, in the shipped order. */
export function defaultHomeSections(): HomeSectionPreference[] {
  return HOME_SECTION_IDS.map((id) => ({ id, visible: true }));
}

export const DEFAULT_PREFERENCES: AppPreferences = {
  language: DEFAULT_APP_LANGUAGE,
  appearance: 'system',
  palette: 'default',
  accent: 'gold',
  fontProfile: 'default',
  readingScale: 'normal',
  density: 'comfortable',
  cardStyle: 'rounded',
  highReadability: false,
  motion: 'system',
  soundEnabled: true,
  hapticsEnabled: true,
  homeSections: defaultHomeSections(),
  widgetContent: 'dailyDua',
  widgetSize: 'medium',
};

/** Shape persisted by the settings store before preferences were unified (v1). */
export interface LegacySettingsPayload {
  readonly appearance?: AppearanceMode;
  readonly language?: AppLanguage;
  readonly readingScale?: import('@/design/tokens/typography').ReadingScale;
  readonly motion?: MotionPreference;
  readonly soundEnabled?: boolean;
  readonly hapticsEnabled?: boolean;
}

/** Which UI surface is currently reachable. Drives offline/error/empty states. */
export type ConnectivityState = 'online' | 'offline' | 'unknown';

/** Deep-link entry points that native home-screen widgets will open. */
export const WIDGET_ROUTES = {
  dailyDua: '/dua/today',
  morningAzkar: '/azkar/morning',
  eveningAzkar: '/azkar/evening',
  tasbeeh: '/tasbeeh',
} as const;

export type WidgetRoute = (typeof WIDGET_ROUTES)[keyof typeof WIDGET_ROUTES];
