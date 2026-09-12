/**
 * DUAA — Environment / configuration.
 *
 * SECURITY RULE: no secret is ever written in source. Everything below is read
 * from `EXPO_PUBLIC_*` variables, which Expo inlines at build time from `.env`
 * (never committed) or from the EAS secret store.
 *
 * Only *public* client config belongs here (API keys that identify the app to
 * Firebase are public by design). Private keys — service accounts, Admin SDK
 * credentials, signing keys — must live in a backend or in EAS secrets and must
 * never be added to this file.
 *
 * Copy `.env.example` to `.env` and fill it in during the Firebase stage. When
 * nothing is configured, `firebase.isConfigured` is `false` and every dependent
 * service reports `NOT_CONFIGURED` instead of pretending to work.
 */

export type AppEnvironment = 'development' | 'preview' | 'production';

function read(key: string): string | undefined {
  const value = (process.env as Record<string, string | undefined>)[key];
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function readBool(key: string, fallback = false): boolean {
  const value = read(key);
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

export interface FirebaseClientConfig {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
}

export interface AppConfig {
  readonly environment: AppEnvironment;
  readonly isProduction: boolean;
  readonly appName: string;
  readonly appSlug: string;
  readonly supportEmail: string;
  readonly privacyPolicyUrl: string;
  readonly termsOfServiceUrl: string;
  readonly firebase: FirebaseClientConfig & {
    /** True only when every field Firebase needs to boot is present. */
    readonly isConfigured: boolean;
  };
  readonly analyticsEnabled: boolean;
  /** Verbose console diagnostics. Off in production. */
  readonly debugLogging: boolean;
}

const REQUIRED_FIREBASE_FIELDS: readonly (keyof FirebaseClientConfig)[] = [
  'apiKey',
  'authDomain',
  'projectId',
  'appId',
  'messagingSenderId',
];

function buildConfig(): AppConfig {
  const environment = (read('EXPO_PUBLIC_APP_ENV') as AppEnvironment | undefined) ?? 'development';

  const firebase: FirebaseClientConfig = {
    apiKey: read('EXPO_PUBLIC_FIREBASE_API_KEY'),
    authDomain: read('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN'),
    projectId: read('EXPO_PUBLIC_FIREBASE_PROJECT_ID'),
    storageBucket: read('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: read('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
    appId: read('EXPO_PUBLIC_FIREBASE_APP_ID'),
    measurementId: read('EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID'),
  };

  const isConfigured = REQUIRED_FIREBASE_FIELDS.every((field) => Boolean(firebase[field]));

  return Object.freeze({
    environment,
    isProduction: environment === 'production',
    appName: read('EXPO_PUBLIC_APP_NAME') ?? 'DUAA | دعاء',
    appSlug: 'duaa',
    supportEmail: read('EXPO_PUBLIC_SUPPORT_EMAIL') ?? 'support@duaa.app',
    privacyPolicyUrl: read('EXPO_PUBLIC_PRIVACY_POLICY_URL') ?? 'https://duaa.app/legal/privacy',
    termsOfServiceUrl: read('EXPO_PUBLIC_TERMS_URL') ?? 'https://duaa.app/legal/terms',
    firebase: Object.freeze({ ...firebase, isConfigured }),
    analyticsEnabled: readBool('EXPO_PUBLIC_ANALYTICS_ENABLED', false),
    debugLogging: readBool('EXPO_PUBLIC_DEBUG_LOGGING', environment !== 'production'),
  });
}

export const config: AppConfig = buildConfig();

/** Names of missing Firebase variables — surfaced in the developer panel. */
export function missingFirebaseVariables(): string[] {
  const map: Record<keyof FirebaseClientConfig, string> = {
    apiKey: 'EXPO_PUBLIC_FIREBASE_API_KEY',
    authDomain: 'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
    projectId: 'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
    storageBucket: 'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
    messagingSenderId: 'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    appId: 'EXPO_PUBLIC_FIREBASE_APP_ID',
    measurementId: 'EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID',
  };
  return (Object.keys(map) as (keyof FirebaseClientConfig)[])
    .filter((key) => !config.firebase[key])
    .map((key) => map[key]);
}
