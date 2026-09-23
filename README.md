# DUAA | دعاء

رفيقك اليومي للأدعية والأذكار والتسبيح — يعمل دون اتصال، ولا يعرض إلا نصوصًا موثَّقة المصدر.
ثلاث لغات (العربية افتراضيًّا، والفرنسية، والإنجليزية) مع تبديلٍ تلقائي لاتجاه الواجهة، وثيمات
وألوان وخطوط قابلة للتخصيص، وصفحة رئيسية ترتّبها كما تشاء، ومجموعات للمفضلة.

An Arabic-first, offline-first duas & azkar companion in **three languages** (Arabic default, French,
English) with automatic RTL/LTR: 147 sourced supplications across 12 categories, morning/evening/sleep
azkar sessions with real repeat counters, a tasbeeh counter with rounds and custom phrases, favourites
with named collections, search, filters and sorting, recently opened duas, a personalized home layout,
8 calm themes × 8 contrast-checked accents × 4 typography profiles × 4 text sizes × 3 reading
densities × 5 card styles, on-device search, text + generated-image sharing, and accessibility treated
as a requirement rather than an afterthought.

Built with Expo SDK 57, TypeScript (strict), expo-router, Zustand and a service layer that is ready
for Firebase — **without a single line of Firebase in the app today**.

---

## Quick start

```bash
npm install                    # add --legacy-peer-deps if npm rejects the jest-expo peer range
cp .env.example .env           # optional: everything works with no configuration at all

npm run web:lan                # web dev server on 0.0.0.0:8081
npm run android                # Android (Expo Go or a dev client)
npm run ios                    # iOS simulator
```

Quality gates:

```bash
npm run typecheck              # tsc --noEmit, strict
npm run lint                   # ESLint 9 flat config (expo preset + project rules)
npm test                       # 222 tests across 16 suites (2 jest projects)
npm run build:web              # static export → dist/ (32 routes)
npm run assets:generate        # regenerate brand PNG/SVG + tasbeeh audio (deterministic)
```

| Script | What it does |
|---|---|
| `start` / `web` / `web:lan` / `android` / `ios` | Expo dev servers (`web:lan` binds `0.0.0.0`) |
| `build:web` | Static web export |
| `typecheck`, `lint`, `test`, `test:watch` | The three gates above |
| `brand:generate`, `audio:generate`, `assets:generate` | Deterministic asset pipelines (no binary is hand-edited) |
| `prebuild`, `doctor` | Native project generation, `expo-doctor` |

---

## What works right now

**Content** — 147 duas/azkar in 12 categories (morning 21, evening 22, sleep 12, travel 10, rizq 10,
parents 8, success 10, healing 9, forgiveness 9, relief 12, prayer 12, general 12), every entry cited
from the Qur'an or a printed collection. See `docs/CONTENT-POLICY.md`.

**Azkar sessions** — morning / evening / sleep with per-dhikr repeat counters, completion state,
daily progress and streaks, all persisted locally.

**Tasbeeh** — tap-to-count dial with haptics + generated audio, per-phrase progress, configurable
target, round completion and roll-over, five presets plus custom phrases you can add and remove.

**Favourites & collections** — real and persisted (`duaId` + `addedAt` + `collectionIds`), add/remove
from the reader or the list, organise into named collections (create, rename, delete — deleting a
collection never deletes its duas), search inside the saved set, filter by collection or category, sort
by recently added or by title, with honest empty states and honest "stored on this device" copy.

**Recently opened** — the last 12 duas you opened, deduplicated, shown on the home screen.

**Three languages** — Arabic (default, RTL), French and English (LTR). Every string lives in
`src/core/i18n/messages/`, direction flips with the language instantly on web, and scripture stays
Arabic in all three by content policy. See [`docs/I18N.md`](docs/I18N.md).

**Personalization** — 8 calm palettes (default, emerald, midnight, sand, ocean, forest, rose,
monochrome), 8 accent colours (all 128 palette × accent × scheme combinations meet WCAG AA),
4 typography profiles over Arabic-first families, 4 text sizes, 3 reading densities, 5 dua card styles,
high-readability mode, reduced motion — one persisted preferences object behind all of it. See
[`docs/PERSONALIZATION.md`](docs/PERSONALIZATION.md).

**Personalized home** — toggle and reorder the 8 home sections (daily dua, morning/evening adhkar,
tasbeeh, favourites, recent, community, quick actions); the last visible section cannot be hidden.

**Search** — instant, offline, Arabic-aware (normalises alef/hamza/ta-marbuta, ignores diacritics),
ranked by match location, with category filters and a persisted recent-terms list you can prune.

**Sharing** — share/copy as formatted text with attribution, or generate a branded 1080 px card
(Canvas 2D on web, `react-native-view-shot` natively) in light or dark palette.

**Home & daily dua** — deterministic "dua of the day" (same day → same dua), greeting by time of day,
shortcuts to the real destinations.

**Settings** — 11 screens: hub, personalization (themes, accents, typography, sizes, density, card
style, high readability), appearance (mode, motion, sound, haptics), home layout, language (ar · fr ·
en), notification *preferences* (stored locally; OS scheduling is honestly reported as not wired),
widget (preferences stored; the native widget is honestly reported as not shipped), account (reports
that no auth backend is configured — no fake Google button), about (version, sources, live
backend-readiness matrix), privacy, terms, and a data reset behind a confirm sheet.

**Onboarding** — four swipeable slides with real copy and illustrations, completion stored locally;
returning users are never shown it again.

**Deep links** — `duaa://` scheme plus web paths: `/dua/today`, `/azkar/morning`, `/azkar/evening`,
`/tasbeeh`, `/category/[categoryId]`, `/dua/[duaId]`, `/favorites`, `/search`, `/settings/*`.

**Community** — an honest empty state that renders the real `NOT_CONFIGURED` message:
"المجتمع قريبًا" · "La communauté arrive bientôt." · "Community is coming soon." No fake posts, no fake
authors, no fake publishing, no fake login.

---

## Documentation

| Document | Contents |
|---|---|
| [`docs/STAGE-2-REPORT.md`](docs/STAGE-2-REPORT.md) | **Current stage report**: what is implemented, what needs external configuration, what is still under development, and what is ready for the Firebase/backend phase |
| [`docs/I18N.md`](docs/I18N.md) | Translation architecture: catalogs and key typing, `useI18n()`, plurals (CLDR), RTL/LTR handling, content policy for translations, how to add a language |
| [`docs/PERSONALIZATION.md`](docs/PERSONALIZATION.md) | The single `AppPreferences` object, theme composition, contrast guarantees, personalized home, collections, persistence vs. account sync |
| [`docs/STAGE-REPORT.md`](docs/STAGE-REPORT.md) | Stage 1 report: structure, stack, run instructions, functional inventory, what is prepared for Firebase, manual configuration, environment limitations |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Layer map, service seam, content layer, state, design system, RTL, accessibility, testing strategy |
| [`docs/FIREBASE-INTEGRATION.md`](docs/FIREBASE-INTEGRATION.md) | Step-by-step wiring plan for Auth / Google Sign-In / Firestore / FCM / Analytics / admin — against the contracts that already exist |
| [`docs/CONTENT-POLICY.md`](docs/CONTENT-POLICY.md) | No-fabrication policy, source vocabulary, entry schema, the 20 integrity tests, change control |
| [`docs/VERIFICATION.md`](docs/VERIFICATION.md) | What was actually run, real numbers, bugs the tests caught, and what could not be verified in this environment |

---

## Project layout

```
src/
├── app/          30 route files (expo-router) → 32 exported routes. Routes only — no business logic.
├── components/   UI kit, layout (AppHeader, BottomTabBar, AppErrorBoundary), feature components
├── features/     Search engine, share text/card, daily dua, user stats, community feed hook
├── store/        10 Zustand stores (settings/preferences, onboarding, favourites, recent duas, tasbeeh, azkar, search, …)
├── services/     contracts/ (13 interfaces) · impl/ (13 implementations) · registry.ts
├── data/         Bundled authentic corpus + tasbeeh presets
├── design/       tokens/ (colour math, palettes, typography, spacing) · theme/ · rtl/
├── core/         config/env · i18n (catalogs + runtime + RTL) · errors · utils (Arabic, dates, logger) · constants · a11y · types
└── hooks/        useReducedMotion, useIsRTL
assets/           fonts (Amiri, IBM Plex Sans Arabic) · images · logo (SVG) · audio (generated WAV)
tests/            logic project (Node) + app-web project (jsdom, real screens)
scripts/          Deterministic brand + audio generators
```

---

## Configuration

All configuration is optional and read through `src/core/config/env.ts` from `EXPO_PUBLIC_*`
variables (`.env.example` documents each one; `.env` is git-ignored). With nothing configured,
`config.firebase.isConfigured` is `false` and the auth/database/community services return an honest
`AppError` that the UI renders verbatim — the app stays fully usable offline. No secret ever belongs
in this repository: `EXPO_PUBLIC_*` values are inlined into the client bundle by design.

---

## License & attribution

Content is drawn from the Qur'an and the cited hadith collections (Hisn al-Muslim, Sahih al-Bukhari,
Sahih Muslim, the four Sunan, Musnad Ahmad, al-Mustadrak and others) — see `docs/CONTENT-POLICY.md`
for the full attribution table.
