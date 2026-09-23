import { AppError } from '@/core/errors/AppError';
import { err, ok, type Result } from '@/core/types/Result';
import { logger } from '@/core/utils/logger';
import { missingFirebaseVariables } from '@/core/config/env';
import type { AppUser, AuthProvider } from '@/core/types/domain';
import { translate } from '@/core/i18n/state';

import type {
  AuthCredentials,
  AuthService,
  AuthStateSnapshot,
  SignUpPayload,
} from '../contracts/AuthService';

const log = logger.child('auth');

/**
 * Honest "no auth backend" implementation.
 *
 * There is deliberately NO mock sign-in, NO fake Google button and NO simulated
 * session anywhere in DUAA. Every method resolves to a `NOT_CONFIGURED`
 * AppError whose `detail` lists exactly which environment variables are
 * missing, so the next stage is a copy-paste of `.env.example` plus a swap of
 * this class for `FirebaseAuthService`.
 *
 * `getCurrentState()` resolves to `status: 'unavailable'` immediately, so the
 * app never shows a spinner waiting for an auth backend that does not exist.
 */
export class UnavailableAuthService implements AuthService {
  readonly isConfigured = false;
  readonly supportedProviders: AuthProvider[] = [];

  private readonly listeners = new Set<(state: AuthStateSnapshot) => void>();

  private static readonly snapshot: AuthStateSnapshot = {
    status: 'unavailable',
    user: null,
  };

  constructor(private readonly featureName = translate('error.feature.auth')) {}

  private unavailable<T>(action: string): Result<T> {
    const missing = missingFirebaseVariables();
    log.info(`${action} requested while auth is unconfigured`, { missing });
    return err(
      AppError.notConfigured(
        this.featureName,
        `AuthService.${action} called with no backend. Missing env: ${missing.join(', ') || 'none'}`,
      ),
    );
  }

  async getCurrentState(): Promise<Result<AuthStateSnapshot>> {
    return ok(UnavailableAuthService.snapshot);
  }

  onAuthStateChange(listener: (state: AuthStateSnapshot) => void): () => void {
    this.listeners.add(listener);
    // Emit the known state once so consumers hydrate synchronously.
    listener(UnavailableAuthService.snapshot);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async signInWithEmail(_credentials: AuthCredentials): Promise<Result<AppUser>> {
    return this.unavailable<AppUser>('signInWithEmail');
  }

  async signUpWithEmail(_payload: SignUpPayload): Promise<Result<AppUser>> {
    return this.unavailable<AppUser>('signUpWithEmail');
  }

  async signInWithProvider(provider: AuthProvider): Promise<Result<AppUser>> {
    return this.unavailable<AppUser>(`signInWithProvider(${provider})`);
  }

  async sendPasswordReset(_email: string): Promise<Result<void>> {
    return this.unavailable<void>('sendPasswordReset');
  }

  async sendEmailVerification(): Promise<Result<void>> {
    return this.unavailable<void>('sendEmailVerification');
  }

  async signOut(): Promise<Result<void>> {
    return this.unavailable<void>('signOut');
  }

  async deleteAccount(): Promise<Result<void>> {
    return this.unavailable<void>('deleteAccount');
  }

  async reauthenticate(_credentials: AuthCredentials): Promise<Result<void>> {
    return this.unavailable<void>('reauthenticate');
  }
}
