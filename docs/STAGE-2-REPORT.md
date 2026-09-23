# DUAA | دعاء — Stage 2 report

**Scope of this stage:** internationalization (Arabic · French · English with automatic RTL/LTR),
a full personalization system (themes, accents, typography, reading appearance, card style), a
personalized home layout, favorite collections, one structured preferences object with honest
local-only sync, and the accessibility/contrast work those features require.

Stage 1 (147 sourced duas, azkar sessions, tasbeeh, search, sharing, offline persistence) is intact:
nothing was rebuilt, no screen was replaced, and the design system was extended rather than forked.

---

## 1. Quality gates (all re-run at this commit)

| Gate | Command | Result |
|---|---|---|
| Types | `npm run typecheck` | exit 0 (`strict: true`) |
| Lint | `npm run lint` | exit 0 — **0 errors, 0 warnings** |
| Tests | `npm test` | **222 / 222 passing**, 16 suites, 2 projects |
| Web build | `npx expo export --platform web` | **32 routes**, exit 0, `<html lang="ar" dir="rtl">` |

Details, per-suite inventory and the bugs these gates caught: [`docs/VERIFICATION.md`](VERIFICATION.md).

---

## 2. What was implemented

### 2.1 Internationalization — ar (default) · fr · en

* `src/core/i18n/` — `messages/{ar,fr,en}.ts` (**842 / 804 / 804** top-level keys), `state.ts`
  (runtime), `plurals.ts` (CLDR), `rtl.ts` (platform direction), `options.ts` (localized option
  builders), `I18nProvider.tsx` (`useI18n()`), `index.ts` (barrel).
* Arabic is the catalog of record: `fr.ts`/`en.ts` are typed `MessageCatalog` against it, so a missing
  or renamed key is a **compile error**, not a raw key on screen.
* Every user-facing string moved to the catalogs: onboarding, home, duas, categories, azkar, tasbeeh,
  favorites, community, profile, settings (all 11 settings screens), notifications, auth, errors, empty
  states, buttons, dialogs/sheets, tab and header navigation, widget text, dates, and every
  accessibility label. Enforced mechanically by `tests/no-hardcoded-strings.test.ts` (a lexer scan of
  `src/**`), not by convention.
* **Direction**: derived from the language (`ar` → RTL, `fr`/`en` → LTR). On web the flip is instant —
  `document.documentElement.dir`/`lang` and react-native-web's `LocaleProvider` are updated in place,
  with **no reload and no restart** (verified by test). On native, `I18nManager.forceRTL()` requires a
  relaunch, so the store records `restartNeededForDirection` and Settings ▸ Language shows an honest
  card saying exactly that, with an acknowledge action. In-component text direction flips immediately
  on both platforms.
* **Selector**: Settings ▸ Language (`/settings/language`) lists the three languages with their native
  names, direction note, and a toast confirming the change; it also states that scripture stays Arabic.
* **Plurals**: `tp(key, count)` with CLDR categories — Arabic `zero/one/two/few/many/other`
  (e.g. `دعاءان محفوظان` for the dual), French `one` for 0 and 1, English `one` for 1.
* **Policy**: religious text is never translated or paraphrased — duas, adhkar and verses remain
  Arabic in all three languages; only UI chrome is localized. Arabic appears in the fr/en catalogs in
  exactly 7 allowlisted keys (brand name, calligraphic wordmark, a dhikr example, the Arabic font
  preview, the native name of Arabic), guarded by `tests/i18n.test.ts`.

### 2.2 Personalization (Settings ▸ Personalization, `/settings/personalization`)

* **Appearance**: Light / Dark / Follow system (kept from stage 1, now part of one object).
* **Themes**: 8 calm, low-saturation palettes — Default (ivory/emerald), Emerald, Midnight, Sand,
  Ocean, Forest, Rose, Monochrome — each derived for light *and* dark from seeds in
  `src/design/tokens/palettes.ts`. No gradients, no decorative clutter.
* **Accent colours**: 8 — Gold, Emerald, Copper, Teal, Sapphire, Rose, Sand, Slate. Every
  palette × accent × scheme combination (128) is contrast-checked at composition time
  (`ensureContrast` bidirectional to WCAG AA 4.5:1, `inkOn()` picks the ink on the accent) and pinned
  by `tests/design/palettes.test.ts`.
* **Typography**: 4 profiles — Default, Elegant, Modern, Classic — built only from the two bundled
  Arabic-first families (IBM Plex Sans Arabic + Amiri), so shaping never breaks; `elegant` moves
  display faces to Amiri naskh over a Plex body.
* **Text size**: Small / Normal / Large / Extra large (0.9 / 1 / 1.18 / 1.38), applied to dua and
  reading surfaces through `theme.scripture()`; the dua reader has its own in-sheet size control. It
  composes with the OS accessibility font scale rather than overriding it.
* **Reading appearance**: Compact / Comfortable / Spacious — line-height scale (0.88 / 1 / 1.14),
  paragraph gap, section gap and card padding scale.
* **Dua card style**: Minimal / Rounded / Elegant / Glass / Classic → `theme.card`
  (radius, border width and colour, background, overlay alpha, hairline, elevation, padding scale).
* **High readability** switch: stronger text contrast and firmer borders on top of any palette/accent.
* Live preview card on the same screen, and a reset that returns appearance preferences to defaults.

### 2.3 Personalized home (Settings ▸ Home layout, `/settings/home`)

* 8 sections, toggled and reordered: Daily dua, Morning adhkar, Evening adhkar, Tasbeeh, Favorites,
  Recent duas, Community, Quick actions.
* The home screen maps `visibleHomeSections(preferences)` — the order and visibility come from the
  stored list, with no hardcoded layout and no per-section conditionals.
* Guards (store-level, tested): the last visible section cannot be hidden; reordering moves a section
  within the visible list only and refuses to move past either end; hidden sections keep their stored
  position so restoring puts them back where they were; "reset order" restores the shipped layout.

### 2.4 Favorites — collections, search, filters, sorting

* Collections (`{ id, name, createdAt }`) stored beside entries; entries carry `collectionIds`.
* Create / rename / delete through bottom sheets, with real validation: name required, unique,
  ≤ `MAX_COLLECTION_NAME = 30` (the constant lives in the `FavoritesService` **contract**, so the UI
  limit and the service rule cannot drift). Errors surface as catalog-driven `AppError.userMessage`s.
* **Deleting a collection never deletes its duas** — membership is stripped, favorites remain (tested).
* Assign a favorite to any number of collections from its row; filter by collection chip
  (`name · count`) or by category; **search inside the saved set** with the same Arabic-aware folding
  as global search; sort by **recently added** or by title.
* **Recent duas**: `src/store/recentDuasStore.ts` records opens (de-duplicated, move-to-front, cap 12)
  and feeds the home "recent" section, with an honest empty state.

### 2.5 One preferences system, persisted

* `AppPreferences` (14 fields, `src/core/types/domain.ts`) is the single source: language, appearance,
  palette, accent, font profile, reading scale, density, card style, high readability, motion, sound,
  haptics, home sections, widget content/size.
* Persisted by `settingsStore` under `duaa:v1:settings` with `partialize → { preferences }`; stage-1
  flat settings are migrated on first load, so existing installs keep their choices.
* **Local when unauthenticated, account-synced when a backend exists**: `syncPreferences()` returns
  `'local' | 'synced' | 'unavailable'`; today it resolves to `'local'` and the profile screen says so
  in the user's language. `toUserPreferencesDocument()` already maps **all 14 fields** onto the
  `UserPreferencesDocument` contract — see §4.

### 2.6 Accessibility

* 44 pt minimum targets (asserted), ARIA state mapped centrally in `src/core/a11y/stateProps.ts`
  (react-native-web 0.21 does not map `accessibilityState`), accessible names from the catalogs in the
  active language, explicit `writingDirection` on text nodes, OS font scale + reduce-motion honoured
  and combined with the in-app `motion` preference.
* WCAG AA body-text contrast for every palette/accent/scheme combination, plus the high-readability
  mode; `SUBTLE_INK` retuned (`#66716C` light / `#758881` dark) after the matrix test failed it.

### 2.7 Honest states where no backend exists

* **Community**: "المجتمع قريبًا" / "La communauté arrive bientôt." / "Community is coming soon." —
  rendered from the live `AppError.userMessage`. No fake posts, authors, likes or publishing.
* **Account**: reports that no auth backend is configured; no simulated sign-in, no fake Google
  button. Provider rows exist only as labels for the configured-provider list, which is empty today.
* **Notifications**: preferences are stored and honoured in-app; OS scheduling is explicitly reported
  as not wired.
* **Widget**: content and size preferences are stored and editable, and the Widget screen says plainly
  that the native home-screen widget is not shipped in this build (it needs a WidgetKit extension /
  AppWidget provider, not just JavaScript).

---

## 3. What needs external configuration (cannot be done from this repository)

| Item | What is needed | Where it plugs in |
|---|---|---|
| Firebase project | `EXPO_PUBLIC_FIREBASE_*` values (api key, auth domain, project id, storage bucket, messaging sender id, app id) in `.env` — see `.env.example` | `src/core/config/env.ts` flips `firebase.isConfigured` to `true`, which is the single switch every "unavailable" service checks |
| Google Sign-In | A Google OAuth client (iOS/Android/Web client IDs) registered in Firebase Auth, plus the SHA-1/SHA-256 fingerprints for Android and the URL scheme for iOS | `AuthService.signInWithProvider('google')`; `supportedProviders` then lists `google` and the account screen offers it |
| Apple Sign-In (optional) | Apple Developer account + Sign in with Apple capability | same contract, provider `apple` |
| Push notifications | APNs key/certificate (iOS) and an FCM sender (Android), plus an Expo push token or FCM config | `NotificationService` scheduling and `settings/notifications.tsx` |
| Native home-screen widget | iOS WidgetKit extension / Android Glance or App Widget (requires `expo prebuild` + native modules) | reads the same `widgetContent` / `widgetSize` preferences |
| Store builds | EAS account, credentials, and `eas.json` profiles | `npm run prebuild`, EAS Build |
| Legal/contact URLs | Real privacy-policy, terms and support addresses | `EXPO_PUBLIC_*` variables, already read by About |

Nothing in the UI branches on Firebase: the service registry resolves an implementation, and screens
consume contracts. Adding configuration swaps implementations, not screens.

---

## 4. What is ready for the Firebase / backend phase

* **Contracts already written** (`src/services/contracts/`, 13 interfaces): `AuthService`
  (email/password, `signInWithProvider`, password reset, email verification, session restore via
  `onAuthStateChange`, re-authentication, account deletion), `UserService`
  (`getPreferences` / `syncPreferences` / profile / stats), `DatabaseService`, `CommunityService`,
  `NotificationService`, `AnalyticsService`, `FavoritesService` (incl. collections), `StorageService`.
* **Registry seam**: `src/services/registry.ts` picks local vs. synced implementations; today it
  returns `Unavailable*` services that fail honestly with `NOT_CONFIGURED`. A
  `FirebaseAuthService` / `SyncedFavoritesService` decorator drops in with no screen change.
* **Preferences sync mapper is complete**: `toUserPreferencesDocument()` covers all 14 fields
  (palette, accent, font profile, density, card style, high readability, motion, home sections,
  widget settings included), and the store already calls `syncPreferences()` after rehydration and
  after each change — implementing the contract turns `'local'` into `'synced'`.
* **Favorites/collections** are modelled for Firestore: stable ids, `addedAt` / `createdAt` timestamps,
  `collectionIds` as an array, service-level subscriptions so multiple screens stay in sync — a
  write-through decorator plus reconciliation is all that is missing.
* **Analytics** events are already emitted at the right moments (`settingChanged`, favorites, tasbeeh
  rounds, share) through the contract; they no-op until configured.
* **Step-by-step plan**: [`docs/FIREBASE-INTEGRATION.md`](FIREBASE-INTEGRATION.md) — Auth, Google
  Sign-In, Firestore schema, FCM, Analytics, security rules and admin, written against these exact
  interfaces.

---

## 5. What remains under development

1. **Community** — the feed, posting, moderation and reporting flows are contract-only
   (`CommunityService` returns `NOT_CONFIGURED`); the UI intentionally shows "coming soon". No fake
   content will be added to make it look finished.
2. **Authentication flows** — Settings ▸ Account renders the real auth state and builds its sign-in
   rows from `auth.supportedProviders`, which is empty today, so no provider button is offered until a
   backend exists. Email/password forms, verification and password-reset screens are part of the
   Firebase phase (the contract methods are already defined).
3. **Notification scheduling** — preferences are stored; OS-level scheduling and push delivery are not
   wired (reported honestly in Settings ▸ Notifications).
4. **Native widget** — its preferences (`widgetContent`, `widgetSize`) are stored and synced-ready;
   the WidgetKit / Glance extension itself is not (requires `expo prebuild` and native code).
5. **Cloud sync of favorites, recents, tasbeeh and azkar progress** — local-only today; the sync
   states and mappers exist, the transports do not.
6. **Hijri calendar accuracy** — dates use a computed Hijri approximation; an authoritative
   moon-sighting/Umm-al-Qura source would be an external service.
7. **Scripture translations** — deliberately out of scope by content policy (`docs/CONTENT-POLICY.md`):
   no translated dua text will be generated or presented as authentic. If translations are ever added,
   they must come from a reviewed, cited source and be labelled as such.

---

## 6. Run it

```bash
npm install --legacy-peer-deps
npm run web:lan          # web dev server on 0.0.0.0:8081
npm run android          # Expo Go / dev client
npm run ios              # simulator

npm run typecheck && npm run lint && npm test
npm run build:web        # static export → dist/ (32 routes)
```

Related docs: [`I18N.md`](I18N.md) · [`PERSONALIZATION.md`](PERSONALIZATION.md) ·
[`ARCHITECTURE.md`](ARCHITECTURE.md) · [`CONTENT-POLICY.md`](CONTENT-POLICY.md) ·
[`FIREBASE-INTEGRATION.md`](FIREBASE-INTEGRATION.md) · [`VERIFICATION.md`](VERIFICATION.md) ·
[`STAGE-REPORT.md`](STAGE-REPORT.md) (stage 1).
