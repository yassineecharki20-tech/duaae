# DUAA | دعاء — Stage report

**Stage:** complete production-quality mobile app (offline-first), with the Firebase stage prepared
but deliberately not implemented.
**Branch:** `arena/01a09721-duaae` · **Date:** 2026-09-12

Status gates, all green at the time of writing:

```
tsc --noEmit (strict)      exit 0
expo lint (ESLint 9)       exit 0 — 0 errors, 0 warnings
jest                       147 passed / 147 — 12 suites, 2 projects
expo export --platform web 29 static routes → dist/
Metro web bundle           HTTP 200, ~5.76 MB dev bundle, no unresolved modules
```

---

## 1. Project structure

```
duaae/
├── app.json                 Expo manifest — Arabic/RTL web config, duaa:// scheme, splash light+dark
├── tsconfig.json            strict, path aliases @/* → src, @/assets/* → assets
├── babel.config.js          babel-preset-expo
├── metro.config.js          Expo Metro defaults (no custom resolution needed)
├── eslint.config.js         ESLint 9 flat config: expo preset + project rules (see §5.3)
├── jest.config.js           two projects → jest.logic.config.js (node) + jest.app.config.js (jsdom)
├── .env.example             every EXPO_PUBLIC_* variable, documented; .env is git-ignored
├── README.md
├── docs/                    ARCHITECTURE · FIREBASE-INTEGRATION · CONTENT-POLICY · VERIFICATION · this report
├── scripts/
│   ├── generate-brand-assets.mjs   deterministic icon/splash/logo/favicon generator (12 PNG + 4 SVG)
│   └── generate-audio-assets.mjs   synthesises the tasbeeh tick + target chime as WAV
├── assets/
│   ├── fonts/               Amiri (Regular, Bold) + IBM Plex Sans Arabic (Regular…Bold, 4 weights)
│   ├── images/              icon, icon-small, icon-night, adaptive icons, splash ×2, favicon ×2, logos ×2
│   ├── logo/                mark.svg, icon.svg, lockup-light.svg, lockup-dark.svg
│   └── audio/               tick.wav, chime.wav (generated)
├── src/
│   ├── app/                 27 route files — expo-router file-based routing, no logic
│   │   ├── _layout.tsx      awaits fonts (min 350 ms, Arabic boot-error fallback) before hiding the
│   │   │                    splash; providers: RTL ▸ theme ▸ toast ▸ navigation theme ▸ error boundary
│   │   ├── +html.tsx        <html lang="ar" dir="rtl">, token-derived pre-hydration CSS
│   │   ├── index.tsx        redirect: onboarding completed ? /(tabs) : /onboarding
│   │   ├── onboarding.tsx   4-slide pager (swipe + buttons), completion persisted
│   │   ├── (tabs)/          index · duas · tasbeeh · community · profile + custom RTL tab bar
│   │   ├── azkar/           morning · evening · sleep
│   │   ├── category/[categoryId].tsx · dua/[duaId].tsx · dua/today.tsx
│   │   ├── favorites.tsx · search.tsx · +not-found.tsx
│   │   └── settings/        index · appearance · notifications · account · language · about · privacy · terms
│   ├── components/
│   │   ├── ui/              AppText, Screen, Button, IconButton, Card, Chip, Controls (TextField/Segmented),
│   │   │                    Progress, BottomSheet, Toast, StateViews, SettingsRow, (SettingsSection, FutureTag, Divider)
│   │   ├── layout/          AppHeader, BottomTabBar, AppErrorBoundary
│   │   ├── duas/            CategoryCard, DuaListItem, FavoriteButton, SourceLine
│   │   ├── azkar/           AzkarSessionView (per-dhikr repeat counters)
│   │   ├── tasbeeh/         CounterRing (SVG progress dial)
│   │   ├── share/           ShareSheet, ShareCardView
│   │   ├── brand/           DuaaLogo (wordmark + crescent mark, theme-aware)
│   │   └── onboarding/      Illustration (SVG, theme-aware)
│   ├── features/            search engine · share text/layout/renderers (web + native) · daily dua
│   │                        · community feed hook · user profile hook + stats collector
│   ├── store/               9 Zustand stores, persisted under versioned keys
│   ├── services/
│   │   ├── contracts/       13 interfaces (Storage, Content, Favorites, Auth, User, Database,
│   │   │                    Notification, Community, Analytics, Connectivity, Clipboard,
│   │   │                    DeviceFeedback, Share)
│   │   ├── impl/            13 implementations (local/Expo-backed, or honest "unavailable")
│   │   └── registry.ts      composition root + describeBackends() readiness report
│   ├── data/                content/ (147 entries, 12 categories, 3 sessions, authoring helpers)
│   │                        · tasbeeh/presets.ts
│   ├── design/              tokens/ (colors, themeColors, spacing, typography, marks, shareCard)
│   │                        · theme/ThemeProvider · rtl/RTLProvider (+ .web)
│   ├── core/                config/env · errors/AppError · utils (arabic, date, logger)
│   │                        · constants/storageKeys · a11y/stateProps · i18n/rtl · types (domain, Result)
│   ├── hooks/               useReducedMotion, useIsRTL
│   └── types/               asset module declarations (wav/png/svg)
└── tests/
    ├── logic (node):        arabic 13 · date 19 · search 11 · content 20 · share 12 · errors 11 · manifest 8
    ├── app-web (jsdom):     smoke 1 · screens 22 · interactions 13 · navigation 7 · accessibility 10
    ├── helpers.tsx          real provider stack + settle/visibleText helpers
    └── setup.ts             native-module mocks; expo-router/js-tabs stub that RECORDS layout props
```

~17,200 lines of TypeScript/TSX across `src`, `scripts` and `tests`.

---

## 2. Technologies

| Layer | Choice | Version |
|---|---|---|
| Runtime | Expo SDK | `~57.0.22` |
| Language | TypeScript (strict) | `~6.0.3` |
| UI | React / React Native / React Native Web | `19.2.3` / `0.86.3` / `~0.21.0` |
| Routing | expo-router (file-based, typed routes) | `~57.0.21` |
| State | Zustand (+ persist middleware) | `5.0.15` |
| Persistence | @react-native-async-storage/async-storage | `2.2.0` |
| Graphics | react-native-svg | `15.15.4` |
| Share capture | react-native-view-shot (native) · Canvas 2D (web) | `5.1.0` |
| Animation | react-native-reanimated + worklets | `4.5.1` / `0.10.1` |
| Gestures | react-native-gesture-handler | `~2.32.0` |
| Device | expo-haptics, expo-audio, expo-clipboard, expo-sharing, expo-localization, expo-application, expo-system-ui, expo-status-bar, expo-splash-screen, expo-font, expo-linking, expo-constants, @react-native-community/netinfo | SDK 57 line |
| Fonts | @expo-google-fonts/amiri, @expo-google-fonts/ibm-plex-sans-arabic + local TTFs in `assets/fonts` | `^0.4.x` |
| Icons | @expo/vector-icons (Ionicons) | `^15.0.2` |
| Asset generation | @resvg/resvg-js (SVG → PNG in Node) | `^2.6.2` |
| Tests | jest `^29.7.0`, jest-expo `^57.0.5`, @testing-library/react `^16.3.3`, @testing-library/dom `^10.4.1` | — |
| Lint | eslint `^9.39.5` + eslint-config-expo `~57.0.2` (flat config) | — |
| Toolchain | Node | `v22.22.3` |

**Not installed, on purpose:** `firebase` (no backend this stage), `expo-notifications` (OS
scheduling is a later stage — the app says so instead of faking it), any purchase/subscription SDK.

Architectural choices worth naming:

* **Service contracts + registry** instead of direct SDK calls — the Firebase swap is a one-file change.
* **`Result<T, AppError>` everywhere** — no thrown exceptions across the service boundary; every error
  carries a code and a ready-to-show Arabic message.
* **Content separated from UI** — `src/data/content` + `ContentService`; a remote source can replace
  the bundled corpus without touching a screen.
* **Design tokens only** — ESLint fails on any hex literal in `src/**` outside `design/tokens`;
  `app.json` (which cannot import tokens) is guarded by a test.
* **Deterministic asset pipeline** — icons, logos and audio are generated from code, so they are
  reproducible and reviewable instead of binary blobs.

---

## 3. How to run

```bash
# 1. Install (add --legacy-peer-deps only if npm rejects the jest-expo peer range)
npm install

# 2. Optional configuration — everything works without it
cp .env.example .env

# 3a. Web (binds 0.0.0.0 so it works behind proxies/previews)
npm run web:lan            # → http://localhost:8081

# 3b. Native
npm run android            # Expo Go or a dev client
npm run ios                # iOS simulator (macOS only)

# 4. Quality gates
npm run typecheck          # tsc --noEmit (strict)
npm run lint               # expo lint → ESLint 9 flat config
npm test                   # 147 tests / 12 suites
npm run test:watch

# 5. Production web build
npm run build:web          # expo export --platform web → dist/ (29 routes)

# 6. Assets (only needed if you change the brand or audio design)
npm run assets:generate    # = audio:generate + brand:generate

# 7. Native project generation / health check
npm run prebuild           # expo prebuild (needs Android SDK / Xcode to go further)
npm run doctor             # expo-doctor
```

Deep links: `duaa://tasbeeh`, `duaa://azkar/morning`, `duaa://azkar/evening`, `duaa://dua/today`,
and the equivalent web paths (`/tasbeeh`, `/azkar/morning`, …).

---

## 4. Fully functional (verified, not intended)

Each item below is exercised by at least one test in `tests/` — see `docs/VERIFICATION.md` for the
mapping.

### 4.1 Content & reading
- 147 duas/azkar across 12 categories, each with title, verbatim text, optional documented virtue,
  repeat count, sources (book / number / narrator / grade, or surah + ayah) and keywords.
- Category browser with **real per-category counts** (`CATEGORIES_WITH_COUNTS`), category screen,
  dua reader with full attribution, previous/next paging (`getAdjacentDuas`).
- Three azkar sessions (morning 21, evening 22, sleep 12) driven by session windows, not copies.
- Daily dua: deterministic per day (same day → same dua, different day → different dua), served
  through `ContentService`, pool excludes heavy-repetition items.
- Unknown ids return `NOT_FOUND` — the app never substitutes a "similar" dua.

### 4.2 Azkar progress
- Per-dhikr repeat counters that advance on tap and stop at the required count ("تم").
- Session completion, per-day progress persistence, completed-days history and streak calculation.
- Session reset (today) and full reset, both persisted.

### 4.3 Tasbeeh
- Tap-to-count dial with SVG progress ring, haptic feedback and generated tick/chime audio
  (both individually switchable in settings).
- Per-phrase progress, configurable target, round completion with roll-over, total counter.
- Five preset phrases, custom phrases (add/remove) persisted separately.
- Reset round / reset phrase / reset everything.

### 4.4 Favourites
- Add/remove from the reader and from the favourites list, persisted across launches, honest empty
  state, and a real round-trip verified by test.

### 4.5 Search
- Instant on-device search with debounce; Arabic-aware normalisation (alef/hamza/ta-marbuta,
  diacritics, tatweel); ranked matching (phrase › title › keyword › category › prefix › contains ›
  source); category filter chips; "matched in" labels; persisted recent terms with per-term removal
  and clear-all; honest empty state; minimum query length of 2.

### 4.6 Sharing
- Share/copy as formatted Arabic text: text → virtue → repeat → sources → category → branding.
- Generated 1080 px share card (light/dark palettes from tokens, crescent mark, wrapped scripture
  lines that preserve Arabic shaping), rendered with Canvas 2D on web and `react-native-view-shot`
  natively, then handed to the OS share sheet.

### 4.7 Home, navigation, onboarding
- Home: time-of-day greeting, daily dua card, shortcuts to the real destinations, offline banner.
- Bottom navigation: five RTL tabs (الرئيسية · الأدعية · التسبيح · المجتمع · حسابي) with a custom
  tab bar, correct `aria-selected`, lazy screens and no header duplication.
- Onboarding: four slides with illustrations, swipe + arrow navigation, progress announcement per
  slide, CTA that routes to the tabs and persists completion; returning users skip it.
- Splash: token colours, light + dark variants, hidden only after fonts load.
- Global error boundary that logs through the logger and offers a real recovery path.
- `+not-found` with real ways out.

### 4.8 Settings (all functional, none decorative)
- **Appearance:** theme (auto/light/dark, applied live and persisted), reading scale
  (small/normal/large/xLarge, affects scripture sizing), motion (full/reduced — reduced suppresses
  every animation), sound and haptics toggles that actually gate the feedback service.
- **Notifications:** preference editing (reminder channels, times, quiet hours) persisted locally;
  the screen states plainly that OS scheduling is not wired and shows the real
  `areRemindersScheduled() === false`.
- **Language:** Arabic active; English shown as planned and disabled ("قريبًا") — no fake switch.
- **Account:** reports the unconfigured auth backend with the service's own message; no fake login.
- **About:** version, content version/stats, sources, and a live backend-readiness matrix from
  `describeBackends()` plus `missingFirebaseVariables()`.
- **Privacy / Terms:** what this build actually does (no network calls, no analytics dispatch, local
  storage only).
- **Reset:** wipes local data behind a confirm sheet (verified: favourites are gone afterwards).

### 4.9 Community
- Honest empty state rendering the live `NOT_CONFIGURED` message from `UnavailableCommunityService`;
  no seeded posts, no fake authors, no fake engagement. The feed hook, error mapping and screen are
  ready for a real backend.

### 4.10 Cross-cutting
- Offline-first: every feature works with no network; `connectivityStore` + `OfflineBanner` reflect
  real NetInfo state.
- RTL: correct in the static HTML (`dir="rtl" lang="ar"`), in RNW via the locale provider, and
  natively via `bootRTL()`; logical properties throughout.
- Themes: light/dark from tokens, OS-following by default, chrome (`theme-color`, native background)
  kept in sync.
- Accessibility: ARIA state on every interactive element (via `core/a11y/stateProps`), 44 pt targets,
  mandatory labels on icon-only controls, explicit text direction, visible alternatives to hidden
  gestures, reduced-motion support.
- Persistence: versioned keys (`duaa:v1:*`) in one constants file.

---

## 5. Prepared for the next stage (built, not stubbed)

### 5.1 Service seam
13 contracts + 13 implementations + one composition root. Firebase work is: add
`src/services/firebase/{client,errors,paths}.ts`, implement `FirebaseAuthService`,
`FirestoreDatabaseService`, `FirestoreCommunityService`, `RemoteFirstContentService`,
`FirebaseAnalyticsService`, `ExpoNotificationService` (decorator), `FirestoreFavoritesService`
(decorator), then change the memoised factories in `registry.ts`. Full plan, including Firestore
collections and security rules: `docs/FIREBASE-INTEGRATION.md`.

### 5.2 Contracts already shaped for the backend
- `AuthService`: email + provider sign-in, sign-up, sign-out, delete, re-authenticate, password
  reset, email verification, `onAuthStateChange`, `supportedProviders`, `isConfigured`.
- `DatabaseService`: Firestore-shaped `collection/query/where/orderBy/limit/startAfter/onSnapshot`,
  `batchWrite`, `runTransaction`.
- `CommunityService`: feed with cursor + sort, post/get/create/delete, like/unlike, save/unsave,
  saved list, author profile + posts, report, `onFeedChange`.
- `ContentService`: identical surface for local and remote sources (see §4.1).
- `NotificationService`: permission status/request, preferences, quiet hours, schedule/cancel/
  cancelAll, `registerDeviceToken`, `subscribeToTopic`, `areRemindersScheduled`.
- `AnalyticsService`: track/screen/setUserProperty/setUserId/logError + `getPendingEvents()` for
  offline buffering. `AnalyticsEvents` constants are already emitted at every meaningful interaction,
  so wiring the SDK produces a real event stream with no UI work.
- `UserService`: profile, display name, stats, local-data reset, subscribe.

### 5.3 Guardrails that keep the seam from leaking
- ESLint blocks `@/services/impl/*` imports from `src/app`, `src/components`, `src/features`.
- ESLint blocks hex literals outside `design/tokens`.
- `tests/manifest.test.ts` blocks `app.json` ↔ token drift.
- `tests/app/screens.test.tsx` pins the honest Community empty state — a future backend must make
  that test *change deliberately*, not silently.

### 5.4 Reserved local state
`StorageKeys` already namespaces `content.cache`, `content.cacheMeta`, `community.drafts`,
`profile.local`, `notifications.preferences`, `diagnostics.lastError` — the remote-first content
service, drafts and device-token storage have keys waiting for them. `authStore` and
`connectivityStore` exist and are wired.

### 5.5 Prepared but deliberately absent (each has a documented path)
| Capability | State today | Path |
|---|---|---|
| Firebase Auth / Google Sign-In | `UnavailableAuthService`, honest messages | §5.1 + `expo-auth-session` for native Google |
| Firestore content/community | local corpus + empty state | `RemoteFirstContentService`, `FirestoreCommunityService` |
| Push notifications / reminders | preferences stored, no OS scheduling | install `expo-notifications`, decorate the service |
| Analytics | no-op that records nothing | `FirebaseAnalyticsService` |
| Home-screen widgets | not present (needs native module) | config plugin + dev client; data already exposed by stores |
| Subscriptions / IAP | not present | separate store + entitlement service (new contract) |
| Admin / moderation | not present | separate Admin-SDK project, never in the client bundle |
| English UI | planned, disabled in settings | keys extraction pass under `src/core/i18n/` |

---

## 6. Manual configuration required

Nothing is required to run the app today. For the next stage, a human must:

1. **Create the Firebase project** and a Web App; copy the seven `EXPO_PUBLIC_FIREBASE_*` values into
   `.env` (or EAS secrets). The five required ones flip `config.firebase.isConfigured`.
2. **Enable Auth providers** (Email/Password, Google) and add the OAuth client IDs; for native Google
   Sign-In, register the `duaa://` redirect URI and add `EXPO_PUBLIC_GOOGLE_*` client IDs through
   `env.ts` (never inline in a component).
3. **Create the Firestore database** and deploy the security rules from
   `docs/FIREBASE-INTEGRATION.md` §6; publish the corpus with the Admin SDK from a separate project.
4. **Set the `moderator` custom claim** for moderation accounts (used by the rules).
5. **Notification credentials**: an Expo push account (or an FCM service-account key held server-side)
   — never in the client bundle.
6. **Legal URLs**: `EXPO_PUBLIC_PRIVACY_POLICY_URL`, `EXPO_PUBLIC_TERMS_URL`, `EXPO_PUBLIC_SUPPORT_EMAIL`
   currently default to `duaa.app` placeholders; replace with the real published pages.
7. **Store identifiers**: `app.duaa.mobile` (iOS bundle id / Android package) and the slug `duaa` are
   placeholders in `app.json`; change them before submitting to the stores, together with real signing
   credentials in EAS.
8. **Analytics consent/policy**: `EXPO_PUBLIC_ANALYTICS_ENABLED` defaults to `false`; flipping it on
   requires a privacy-policy update (the in-app privacy screen describes what is and is not sent).
9. **Native builds**: `expo prebuild` + Android SDK / Xcode (unavailable in this environment), plus
   Google Services / `GoogleService-Info.plist` files for native Firebase.

---

## 7. Arena-environment limitations (and their consequences)

| Limitation | Consequence | Mitigation used |
|---|---|---|
| Only `registry.npmjs.org` reachable over HTTPS from the sandbox; `curl` to other hosts fails; no `apt` (permission denied) | `npx expo install` cannot fetch its version manifest; no system libraries can be added | Package versions resolved from Expo's published `bundledNativeModules.json` + `npm install --legacy-peer-deps` where peers disagreed |
| No headless browser (Chromium needs `libnss3`/`libnspr4`, unavailable) | No screenshots, no real-browser E2E | jsdom + @testing-library suites that drive real controls and assert computed styles/rendered text; Metro bundle checks over HTTP; dev-server log inspection |
| No iOS/Android SDK, emulator or device | Native-only paths (view-shot capture, haptics, sharing sheet, FCM, widgets, `expo prebuild`) cannot be executed | Platform-split modules with a shared layout engine (`shareCardLayout`) so both renderers compute identical geometry; type-safety + contract tests; documented as unverified in `docs/VERIFICATION.md` §5 |
| No Firebase project or credentials | Backend behaviour can only be verified to fail *honestly* | `NOT_CONFIGURED` paths asserted in tests; integration plan written against real contracts |
| 2 vCPU / ~4 GB RAM | Full Metro + Jest + export runs must be sequential; heavy watchers are avoided | `CI=1` for exports; two lean Jest projects (node logic vs jsdom app) instead of one big transform |
| Static export renders the boot shell, not screen content | `dist/*.html` is not proof of screen rendering | Screen coverage comes from the jsdom suite (22 route tests) |
| Long-lived processes are managed by the platform, not the shell | The dev server must be started as a managed process | Running as `duaa-web-app` on port 8081, bound to `0.0.0.0` for the preview proxy |
| Artifact/patchset caps (~128 MB, ~10,000 files) | Generated bundles must stay out of Git | `dist/`, `.expo/`, `node_modules/` ignored; assets are small and generated deterministically from scripts |
| No user-supplied secrets (and none should ever be pasted into chat) | Firebase cannot be configured from here | `.env.example` + `docs/FIREBASE-INTEGRATION.md` hand the exact steps to a human |

---

## 8. Acceptance check against the original brief

| Requirement | Status |
|---|---|
| Production-quality, not a prototype | 147 tests, strict TS, lint clean, static export builds, deterministic assets |
| Duas/azkar categories (morning, evening, sleep, travel, sustenance, parents, success, healing, forgiveness, relief, prayer, general) | All 12 present with real counts |
| Tasbeeh counter | Dial, targets, rounds, presets, custom phrases, haptics + audio |
| Real local favourites | Persisted, add/remove both directions, verified |
| Search | Arabic-aware, ranked, filters, recent terms, empty state |
| Share (text + generated card) | Formatted text + 1080 px generated image, web + native renderers |
| Settings | Appearance, notifications, language, account, about, privacy, terms, reset |
| Onboarding (4 screens) + splash + home | Implemented and persisted |
| Bottom nav (5 Arabic tabs) | Custom RTL tab bar, lazy screens, ARIA-correct |
| Offline-first | Everything local; NetInfo-driven banner |
| Accessibility | ARIA state, targets, labels, directions, reduced motion, visible alternatives to gestures |
| RTL Arabic-first | HTML, RNW locale, native boot, logical properties |
| Light/dark themes with tokens (deep emerald, warm ivory, subtle gold) | Token-only colours, enforced by lint + manifest test |
| Arabic fonts (Amiri + IBM Plex Sans Arabic) | Loaded from `assets/fonts`, awaited before splash hides |
| Logo from "دعاء" + subtle crescent | Generated SVG/PNG marks, theme-aware |
| Prepare (not fake) Firebase Auth/Google/Firestore/FCM/widgets/analytics/subscriptions/admin | Contracts + registry + env + docs; no SDK installed |
| Deep links `/dua/today`, `/azkar/morning`, `/azkar/evening`, `/tasbeeh` | Routes exist; `duaa://` scheme declared |
| Community tab with honest empty state | Renders the live `NOT_CONFIGURED` message |
| No fabricated hadith | Cited corpus only, enforced by 20 integrity tests + policy doc |
| Must not require a rebuild later | Extension points documented; UI/store/route APIs unchanged by the Firebase plan |
| No fake buttons/logins/data | Verified by tests; unavailable features say so in Arabic |
