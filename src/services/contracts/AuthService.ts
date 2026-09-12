import type { AppUser, AuthProvider, AuthStatus } from '@/core/types/domain';
import type { Result } from '@/core/types/Result';

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface SignUpPayload extends AuthCredentials {
  displayName?: string;
}

export interface AuthStateSnapshot {
  status: AuthStatus;
  user: AppUser | null;
}

/**
 * Authentication contract.
 *
 * This stage ships `UnavailableAuthService`: it reports `status: 'unavailable'`
 * and returns `NOT_CONFIGURED` for every operation. That is deliberate — there
 * is NO mock sign-in, NO fake Google button and NO simulated session anywhere
 * in the app. The screens read this state and explain exactly what is missing.
 *
 * The Firebase stage implements `FirebaseAuthService` against the same
 * interface:
 *   • email/password           -> signIn / signUp / sendPasswordReset
 *   • Google Sign-In           -> signInWithProvider('google')
 *   • persistent sessions      -> `authStateChange` emits the restored user
 *   • email verification       -> sendEmailVerification / user.emailVerified
 */
export interface AuthService {
  readonly isConfigured: boolean;
  /** Providers this build can actually offer. Empty until Firebase is wired. */
  readonly supportedProviders: AuthProvider[];

  getCurrentState(): Promise<Result<AuthStateSnapshot>>;
  /** Emits on sign-in, sign-out, token refresh and session restore. */
  onAuthStateChange(listener: (state: AuthStateSnapshot) => void): () => void;

  signInWithEmail(credentials: AuthCredentials): Promise<Result<AppUser>>;
  signUpWithEmail(payload: SignUpPayload): Promise<Result<AppUser>>;
  signInWithProvider(provider: AuthProvider): Promise<Result<AppUser>>;
  sendPasswordReset(email: string): Promise<Result<void>>;
  sendEmailVerification(): Promise<Result<void>>;
  signOut(): Promise<Result<void>>;
  /** Irreversible account deletion — requires a configured backend. */
  deleteAccount(): Promise<Result<void>>;
  /** Re-authenticate before destructive actions. */
  reauthenticate(credentials: AuthCredentials): Promise<Result<void>>;
}
