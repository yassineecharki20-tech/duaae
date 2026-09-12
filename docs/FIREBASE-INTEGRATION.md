# DUAA | دعاء — Firebase integration guide (next stage)

This is the wiring plan for the stage that adds Firebase. It is written against the contracts that
**already exist** in `src/services/contracts/`, so no screen, store, route or design token has to be
rewritten — that is the whole point of the abstraction layer.

> Status today: **no Firebase dependency is installed**, no SDK is initialised, and every
> backend-dependent surface reports `NOT_CONFIGURED` with an Arabic message the UI renders verbatim.
> Nothing in the app pretends a backend exists.

---

## 0. What already exists (do not rebuild it)

| Piece | Path | Why it matters for Firebase |
|---|---|---|
| Public config reader | `src/core/config/env.ts` | Reads the seven `EXPO_PUBLIC_FIREBASE_*` vars and exposes `config.firebase.isConfigured` + `missingFirebaseVariables()` |
| Env template | `.env.example` | Every variable documented; `.env` is git-ignored |
| Composition root | `src/services/registry.ts` | The **only** file that picks implementations |
| Contracts | `src/services/contracts/*.ts` | 13 interfaces, all returning `Promise<Result<T, AppError>>` |
| Honest fallbacks | `src/services/impl/Unavailable*.ts` | Keep them — they are the fallback when config is missing |
| Error taxonomy | `src/core/errors/AppError.ts` | Map Firebase error codes onto `AppErrorCode` here |
| Reserved storage keys | `src/core/constants/storageKeys.ts` | `content.cache`, `content.cacheMeta`, `community.drafts`, `profile.local` are already namespaced |
| Auth cache store | `src/store/authStore.ts` | Ready to hold the real snapshot |
| Analytics queue | `NoopAnalyticsService.getPendingEvents()` | Offline event buffering contract already defined |
| Backend readiness panel | `src/app/settings/about.tsx` | Renders `describeBackends()` — it will light up automatically |

---

## 1. Install

```bash
npm install firebase                 # JS SDK v11+ — works on web and in the Expo native runtime
npx expo install expo-notifications  # only when the reminder stage starts (NOT installed today)
```

Google Sign-In on **native** needs a browser-auth flow, because the Firebase JS SDK's
`signInWithPopup` is web-only:

```bash
npx expo install expo-auth-session expo-web-browser expo-crypto
```

Then in `app.json` add the scheme-based redirect (the `duaa://` scheme is already declared) and the
iOS/Android client IDs from the Firebase console into `.env` as `EXPO_PUBLIC_GOOGLE_*` (public client
IDs are not secrets). Add them to `env.ts` the same way the Firebase fields are read — never inline.

---

## 2. Configure

```bash
cp .env.example .env      # then paste the web-app config from the Firebase console
```

The five required fields (`apiKey`, `authDomain`, `projectId`, `appId`, `messagingSenderId`) flip
`config.firebase.isConfigured` to `true`. Settings → About already lists whichever variables are
missing via `missingFirebaseVariables()`, so a misconfigured build explains itself instead of
crashing.

For EAS builds, set the same variables as EAS secrets (`eas secret:create`) — do not commit `.env`.

---

## 3. Add the Firebase bootstrap module

New folder: `src/services/firebase/`

```
src/services/firebase/
├── client.ts        # initializeApp guard + getAuth/getFirestore/getAnalytics accessors
├── errors.ts        # FirebaseError.code -> AppError mapping (one table)
└── paths.ts         # collection path constants (duas, categories, posts, users, reports…)
```

`client.ts` must be **lazy** — the registry memoises instances, so the SDK is only initialised when
a screen actually asks for it:

```ts
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { config } from '@/core/config/env';
import { AppError } from '@/core/errors/AppError';

let app: FirebaseApp | null = null;

export function firebaseApp(): FirebaseApp {
  if (!config.firebase.isConfigured) throw AppError.notConfigured('firebase');
  if (!app) app = getApps()[0] ?? initializeApp(config.firebase);
  return app;
}

export const auth = (): Auth => getAuth(firebaseApp());
export const db = (): Firestore => getFirestore(firebaseApp());
```

`errors.ts` keeps the mapping in one place so Arabic messages stay consistent:

| Firebase | `AppErrorCode` |
|---|---|
| `auth/network-request-failed`, `unavailable` | `OFFLINE` |
| `auth/user-not-found`, `permission-denied`, `not-found` | `NOT_FOUND` |
| `auth/invalid-credential`, `auth/weak-password`, `failed-precondition` | `VALIDATION` |
| `permission-denied` on write | `NOT_CONFIGURED` (rules not deployed) or `VALIDATION` |
| anything else | `UNKNOWN` (with `cause` attached for logging) |

---

## 4. Implement the services

One file per implementation in `src/services/impl/`. Each must satisfy its contract exactly — the
compiler is the spec.

### 4.1 `FirebaseAuthService implements AuthService`
* `isConfigured` → `config.firebase.isConfigured`
* `supportedProviders` → `['email', 'google']` (only what this build can really do)
* `signInWithEmail` / `signUpWithEmail` → `signInWithEmailAndPassword`, `createUserWithEmailAndPassword`, then `updateProfile` for `displayName`
* `signInWithProvider('google')`:
  * web → `signInWithPopup(auth(), new GoogleAuthProvider())`
  * native → `expo-auth-session` token, then `signInWithCredential(auth(), GoogleAuthProvider.credential(idToken))`
* `onAuthStateChange` → wrap `onAuthStateChanged`, mapping `User` → `AppUser` (`uid`, `email`, `displayName`, `photoURL`, `emailVerified`, `providerIds`) and emitting `{ status: 'authenticated' | 'unauthenticated' }`
* `getCurrentState` → resolve the first emission (or `auth().currentUser` when already restored)
* `signOut`, `deleteAccount` (`deleteUser` + a Firestore cleanup write), `reauthenticate` (`reauthenticateWithCredential`), `sendPasswordReset`, `sendEmailVerification`
* Feed `authStore` from the screen layer only — the service must not import stores (cycle guard).

### 4.2 `FirestoreDatabaseService implements DatabaseService`
`QueryOptions` is already Firestore-shaped (`constraints`, `orderBy`, `limit`, `startAfter`):
* `collection<T>(path)` → `collection(db(), path)`; `get(options)` builds `query(...)` from the options and maps `QuerySnapshot` → `T[]` (spreading `id`)
* `doc(id).get/set/update/remove` → the Firestore equivalents, `set` honouring `{ merge }`
* `onSnapshot` → return the unsubscribe function (the contract's `Subscription` is exactly `() => void`)
* `batchWrite` → `writeBatch` with the three `BatchOperation` variants
* `runTransaction` → `runTransaction` with the `TransactionContext` surface

### 4.3 `FirestoreCommunityService implements CommunityService`
Suggested shape (matches the contract, keeps reads cheap):

```
posts/{postId}            { authorUid, authorName, body, duaId?, createdAt, likeCount, reportedCount }
posts/{postId}/likes/{uid}                       → like()/unlike() are idempotent writes
users/{uid}/saved/{postId}                       → save()/unsave()/getSavedPosts()
reports/{reportId}        { postId, reason, detail, reporterUid, createdAt, state }
```

* `getFeed({cursor, limit, sort})` → `orderBy('createdAt','desc')` + `startAfter(cursor)`; return `hasMore` from `snapshot.size === limit` and the last doc id as the next cursor
* `onFeedChange` → `onSnapshot` on the same query, mapping errors through `errors.ts`
* `report` → write-only from the client; moderation state is server-side only

The Community tab currently renders the honest empty state from `UnavailableCommunityService`. Once
the real service returns data, the same screen renders posts — no UI rewrite, and **no seeded demo
posts** (fabricated community content is explicitly out of scope).

### 4.4 `RemoteFirstContentService implements ContentService` (decorator)
Wrap `LocalContentService` rather than replacing it:

```ts
export class RemoteFirstContentService implements ContentService {
  constructor(private readonly remote: DatabaseService, private readonly local: LocalContentService) {}

  async listDuas(categoryId?: string) {
    const cached = await readCache(StorageKeys.contentCache);        // keys already reserved
    if (cached) return Result.ok(cached);
    const remote = await this.remote.collection<Dua>('duas').get({ /* … */ });
    if (remote.ok) { await writeCache(remote.data); return remote; }
    return this.local.listDuas(categoryId);                          // offline-first fallback
  }
}
```

Rules: bundled content stays the floor (the app must work with no network and no backend);
`CONTENT_VERSION` gates cache invalidation; **only authenticated-source documents may be published**
to Firestore (see `docs/CONTENT-POLICY.md` — no generated religious text).

### 4.5 `FirestoreFavoritesService` (decorator over `LocalFavoritesService`)
Local write first (instant UI), then sync when `auth` + `db` are available. Merge rule: union by
`addedAt` (newest wins for the same `duaId`), never silently drop a local favourite.

### 4.6 `FirebaseAnalyticsService implements AnalyticsService`
`track` → `logEvent`, `screen` → `logEvent('screen_view', …)`, `setUserProperty`, `setUserId`,
`logError` → `logEvent('app_error', …)` (Crashlytics is a separate native dependency; if you want
crash reporting, add `@react-native-firebase/crashlytics` in a dev-client build, not in Expo Go).
Gate everything on `config.analyticsEnabled` and flush `getPendingEvents()` when
`connectivityStore` reports online.

### 4.7 `ExpoNotificationService` (decorator over `LocalNotificationPreferencesService`)
Install `expo-notifications` first. Keep the preference storage exactly as it is (local, offline),
then add: `requestPermission` → `Notifications.requestPermissionsAsync`,
`schedule` → `Notifications.scheduleNotificationAsync` with the Islamic-calendar-aware trigger times
computed by `src/core/utils/date.ts`, `registerDeviceToken` → Expo push token (or FCM token via
`getDevicePushTokenAsync`) written to `users/{uid}/devices/{token}`, `areRemindersScheduled` →
`true` only once scheduling really happens. Until then it must keep returning `false` — the
Notifications screen renders that value verbatim and says scheduling is not wired.

> Home-screen **widgets** are a native module concern: they need a config plugin + dev-client build
> (Android `AppWidgetProvider`, iOS WidgetKit). Nothing in the JS layer blocks them; the data they
> would show (`getDailyDua(seed)`, tasbeeh progress) is already exposed by stores/services.

---

## 5. Flip the registry

`src/services/registry.ts` is the only file that changes. Keep the fallbacks:

```ts
const auth = memoize<AuthService>(() =>
  config.firebase.isConfigured ? new FirebaseAuthService() : new UnavailableAuthService(),
);

const database = memoize<DatabaseService>(() =>
  config.firebase.isConfigured ? new FirestoreDatabaseService() : new UnavailableDatabaseService(),
);

const content = memoize<ContentService>(() =>
  config.firebase.isConfigured
    ? new RemoteFirstContentService(database(), new LocalContentService())
    : new LocalContentService(),
);
```

…and the same three-line pattern for `community`, `analytics`, `notifications`, `favorites`.
`describeBackends()` (used by Settings → About and by tests) reports the chosen implementation per
key, so the readiness panel updates itself.

---

## 6. Firestore security rules (deploy from a separate `firestore/` folder)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Public, read-only, curated corpus. Writes are admin-only (see §7).
    match /duas/{id}        { allow read: if true;                       allow write: if false; }
    match /categories/{id}  { allow read: if true;                       allow write: if false; }

    // Community: signed-in users read, authors write their own docs.
    match /posts/{postId} {
      allow read: if request.auth != null && resource.data.reportedCount < 5;
      allow create: if request.auth != null && request.resource.data.authorUid == request.auth.uid;
      allow update: if request.auth != null && (resource.data.authorUid == request.auth.uid
                     || request.auth.token.moderator == true);
      allow delete: if request.auth != null && resource.data.authorUid == request.auth.uid;

      match /likes/{uid} { allow read, write: if request.auth != null && request.auth.uid == uid; }
    }

    match /users/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == uid;
      match /saved/{postId} { allow read, write: if request.auth != null && request.auth.uid == uid; }
      match /devices/{token} { allow read, write: if request.auth != null && request.auth.uid == uid; }
    }

    // Reports: write-only from clients, read by moderators.
    match /reports/{reportId} {
      allow create: if request.auth != null;
      allow read, update: if request.auth != null && request.auth.token.moderator == true;
    }
  }
}
```

---

## 7. Admin / back office (separate project, never in this bundle)

* A separate Node project (or Cloud Functions) holds the **Admin SDK / service-account key**. The
  client bundle must never contain it — `EXPO_PUBLIC_*` values are inlined into shipped JS.
* Content pipeline: import the same typed corpus (`src/data/content`) into Firestore with the Admin
  SDK, stamping `CONTENT_VERSION` and the source references. This guarantees the remote copy and the
  bundled fallback cannot diverge in wording.
* Moderation queue for `reports/*`, plus the `moderator` custom claim used by the rules above.

---

## 8. Testing the new implementations

* Keep the pure `logic` project pure — no Firebase in it.
* Add `tests/services/*.contract.test.ts` per implementation, run against the **Firebase emulator
  suite** (`firebase emulators:exec --project duaa-dev "jest --selectProjects services"`), so tests
  exercise real rule enforcement instead of mocks.
* Every existing app-web test must keep passing unchanged. That is the acceptance criterion for
  "the abstraction held": if a screen test has to be edited to accommodate Firebase, the seam leaked.
* Add a test asserting the registry falls back to `Unavailable*` when
  `config.firebase.isConfigured === false` (mirrors `tests/app/screens.test.tsx`'s community
  assertion, which pins the honest empty state).

---

## 9. What must NOT change

Routes (`src/app/**`), the UI kit, design tokens, stores' public APIs, the content schema
(`src/core/types/domain.ts`), the Arabic copy, and the offline-first guarantee. If a Firebase change
forces any of those to move, treat it as a design defect in the new implementation, not as expected
cost.
