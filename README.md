# DUAA | دعاء

رفيقك اليومي للأدعية والأذكار والتسبيح — تطبيق عربيٌّ بالكامل، يعمل دون اتصال، ولا يعرض إلا
نصوصًا موثَّقة المصدر.

An Arabic-first, offline-first duas & azkar companion: 147 sourced supplications across 12
categories, morning/evening/sleep azkar sessions with real repeat counters, a tasbeeh counter with
rounds and custom phrases, real local favourites, on-device search, text + generated-image sharing,
light/dark themes from design tokens, full RTL, and accessibility treated as a requirement rather
than an afterthought.

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
npm test                       # 147 tests across 12 suites (2 jest projects)
npm run build:web              # static export → dist/ (29 routes)
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

**Favourites** — real and persisted (`duaId` + `addedAt`), add/remove from the reader or from the
favourites list, with an honest empty state when there are none.

**Search** — instant, offline, Arabic-aware (normalises alef/hamza/ta-marbuta, ignores diacritics),
ranked by match location, with category filters and a persisted recent-terms list you can prune.

**Sharing** — share/copy as formatted text with attribution, or generate a branded 1080 px card
(Canvas 2D on web, `react-native-view-shot` natively) in light or dark palette.

**Home & daily dua** — deterministic "dua of the day" (same day → same dua), greeting by time of day,
shortcuts to the real destinations.

**Settings** — appearance (theme, reading scale, motion, sound, haptics), notification *preferences*
(stored locally; OS scheduling is honestly reported as not wired), language (Arabic shipped; English
labelled "قريبًا"), account (reports that no auth backend is configured), about (version, sources,
live backend-readiness matrix), privacy, terms, and a data reset behind a confirm sheet.

**Onboarding** — four swipeable slides with real copy and illustrations, completion stored locally;
returning users are never shown it again.

**Deep links** — `duaa://` scheme plus web paths: `/dua/today`, `/azkar/morning`, `/azkar/evening`,
`/tasbeeh`, `/category/[categoryId]`, `/dua/[duaId]`, `/favorites`, `/search`, `/settings/*`.

**Community** — an honest empty state that renders the real `NOT_CONFIGURED` message. No fake posts,
no fake authors, no fake login.

---

## Documentation

| Document | Contents |
|---|---|
| [`docs/STAGE-REPORT.md`](docs/STAGE-REPORT.md) | This stage's full report: structure, stack, run instructions, functional inventory, what is prepared for Firebase, manual configuration, environment limitations |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Layer map, service seam, content layer, state, design system, RTL, accessibility, testing strategy |
| [`docs/FIREBASE-INTEGRATION.md`](docs/FIREBASE-INTEGRATION.md) | Step-by-step wiring plan for Auth / Google Sign-In / Firestore / FCM / Analytics / admin — against the contracts that already exist |
| [`docs/CONTENT-POLICY.md`](docs/CONTENT-POLICY.md) | No-fabrication policy, source vocabulary, entry schema, the 20 integrity tests, change control |
| [`docs/VERIFICATION.md`](docs/VERIFICATION.md) | What was actually run, real numbers, bugs the tests caught, and what could not be verified in this environment |

---

## Project layout

```
src/
├── app/          27 route files (expo-router). Routes only — no business logic.
├── components/   UI kit, layout (AppHeader, BottomTabBar, AppErrorBoundary), feature components
├── features/     Search engine, share text/card, daily dua, user stats, community feed hook
├── store/        9 Zustand stores (settings, onboarding, favourites, tasbeeh, azkar, search, …)
├── services/     contracts/ (13 interfaces) · impl/ (13 implementations) · registry.ts
├── data/         Bundled authentic corpus + tasbeeh presets
├── design/       tokens/ · theme/ · rtl/
├── core/         config/env · errors · utils (Arabic, dates, logger) · constants · a11y · types
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
