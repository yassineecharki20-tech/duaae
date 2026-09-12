import { AppError } from '@/core/errors/AppError';
import { err, type Result } from '@/core/types/Result';
import { logger } from '@/core/utils/logger';
import { missingFirebaseVariables } from '@/core/config/env';

import type {
  BatchOperation,
  CollectionReference,
  DatabaseService,
  DocumentReference,
  QueryOptions,
  Subscription,
  TransactionContext,
} from '../contracts/DatabaseService';

const log = logger.child('database');

function notConfigured<T>(operation: string): Result<T> {
  log.info(`${operation} requested while the database is unconfigured`);
  return err(
    AppError.notConfigured(
      'قاعدة البيانات',
      `${operation} called with no Firestore backend. Missing env: ${missingFirebaseVariables().join(', ') || 'none'}`,
    ),
  );
}

/**
 * Firestore-shaped no-op database.
 *
 * Every method returns `NOT_CONFIGURED` instead of inventing data. The
 * community tab, the sync badges and the profile "cloud" row all read that
 * error and explain themselves. Swapping in `FirestoreDatabaseService` keeps
 * every call site identical.
 */
export class UnavailableDatabaseService implements DatabaseService {
  readonly isConfigured = false;

  collection<T = Record<string, unknown>>(path: string): CollectionReference<T> {
    const collection: CollectionReference<T> = {
      async get(_options?: QueryOptions) {
        return notConfigured<T[]>(`collection(${path}).get`);
      },
      doc(id: string): DocumentReference<T> {
        const ref: DocumentReference<T> = {
          id,
          async get() {
            return notConfigured<T | null>(`doc(${path}/${id}).get`);
          },
          async set() {
            return notConfigured<void>(`doc(${path}/${id}).set`);
          },
          async update() {
            return notConfigured<void>(`doc(${path}/${id}).update`);
          },
          async remove() {
            return notConfigured<void>(`doc(${path}/${id}).remove`);
          },
          onSnapshot(_onNext, onError) {
            onError(AppError.notConfigured('قاعدة البيانات', `doc(${path}/${id}).onSnapshot`));
            return () => undefined;
          },
        };
        return ref;
      },
      async add() {
        return notConfigured<T>(`collection(${path}).add`);
      },
      onSnapshot(_onNext, onError) {
        onError(AppError.notConfigured('قاعدة البيانات', `collection(${path}).onSnapshot`));
        return (() => undefined) as Subscription;
      },
    };
    return collection;
  }

  async batchWrite(operations: BatchOperation[]): Promise<Result<void>> {
    return notConfigured<void>(`batchWrite(${operations.length} ops)`);
  }

  async runTransaction<T>(
    _fn: (tx: TransactionContext) => Promise<T>,
  ): Promise<Result<T>> {
    return notConfigured<T>('runTransaction');
  }
}
