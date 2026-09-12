import type { Result } from '@/core/types/Result';

export type QueryOperator = '==' | '!=' | '<' | '<=' | '>' | '>=' | 'in' | 'array-contains';

export interface QueryConstraint {
  field: string;
  operator: QueryOperator;
  value: unknown;
}

export interface QueryOptions {
  constraints?: QueryConstraint[];
  orderBy?: { field: string; direction: 'asc' | 'desc' }[];
  limit?: number;
  startAfter?: unknown[];
}

/** Handle returned by a live query — call it to stop receiving updates. */
export interface Subscription {
  (): void;
}

/**
 * Database contract — a deliberately thin, Firestore-shaped abstraction.
 *
 * Nothing in the UI or the stores imports Firebase. They call `db.collection(...)`.
 * In this stage the implementation is `UnavailableDatabaseService`, so every
 * call returns `NOT_CONFIGURED` and the app falls back to bundled content.
 *
 * Firebase stage: `FirestoreDatabaseService` maps these calls onto
 * `collection / query / where / orderBy / limit / onSnapshot`.
 */
export interface DatabaseService {
  readonly isConfigured: boolean;

  collection<T = Record<string, unknown>>(path: string): CollectionReference<T>;
  /** Single atomic write of several documents. */
  batchWrite(operations: BatchOperation[]): Promise<Result<void>>;
  runTransaction<T>(fn: (tx: TransactionContext) => Promise<T>): Promise<Result<T>>;
}

export interface CollectionReference<T> {
  get(options?: QueryOptions): Promise<Result<T[]>>;
  doc(id: string): DocumentReference<T>;
  add(data: Omit<T, 'id'>): Promise<Result<T>>;
  onSnapshot(
    onNext: (items: T[]) => void,
    onError: (error: unknown) => void,
    options?: QueryOptions,
  ): Subscription;
}

export interface DocumentReference<T> {
  readonly id: string;
  get(): Promise<Result<T | null>>;
  set(data: Partial<T>, options?: { merge?: boolean }): Promise<Result<void>>;
  update(data: Partial<T>): Promise<Result<void>>;
  remove(): Promise<Result<void>>;
  onSnapshot(
    onNext: (item: T | null) => void,
    onError: (error: unknown) => void,
  ): Subscription;
}

export type BatchOperation =
  | { type: 'set'; path: string; data: Record<string, unknown>; merge?: boolean }
  | { type: 'update'; path: string; data: Record<string, unknown> }
  | { type: 'delete'; path: string };

export interface TransactionContext {
  get<T>(path: string): Promise<T | null>;
  set(path: string, data: Record<string, unknown>, options?: { merge?: boolean }): void;
  update(path: string, data: Record<string, unknown>): void;
  delete(path: string): void;
}

/** Firestore collection paths the next stage will use. */
export const Collections = {
  users: 'users',
  duas: 'duas',
  categories: 'categories',
  favorites: (uid: string) => `users/${uid}/favorites`,
  tasbeeh: (uid: string) => `users/${uid}/tasbeeh`,
  posts: 'community/posts',
  reports: 'community/reports',
  deviceTokens: (uid: string) => `users/${uid}/deviceTokens`,
} as const;
