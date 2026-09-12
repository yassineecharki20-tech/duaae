import AsyncStorage from '@react-native-async-storage/async-storage';

import { AppError } from '@/core/errors/AppError';
import { logger } from '@/core/utils/logger';
import { err, ok, type Result } from '@/core/types/Result';
import { STORAGE_NAMESPACE } from '@/core/constants/storageKeys';

import type { StorageService } from '../contracts/StorageService';

const log = logger.child('storage');

/**
 * AsyncStorage-backed implementation of `StorageService`.
 *
 * Every method returns a `Result` — a storage failure degrades the affected
 * feature (favorites, tasbeeh progress) instead of crashing the app, and the
 * failure is logged for the diagnostics stage.
 */
export class AsyncStorageService implements StorageService {
  private available = true;

  isAvailable(): boolean {
    return this.available;
  }

  async getString(key: string): Promise<Result<string | null>> {
    try {
      const value = await AsyncStorage.getItem(key);
      return ok(value);
    } catch (cause) {
      this.available = false;
      log.error('getString failed', { key, cause });
      return err(AppError.storage(`getString(${key})`, cause));
    }
  }

  async setString(key: string, value: string): Promise<Result<void>> {
    try {
      await AsyncStorage.setItem(key, value);
      this.available = true;
      return ok(undefined);
    } catch (cause) {
      log.error('setString failed', { key, cause });
      return err(AppError.storage(`setString(${key})`, cause));
    }
  }

  async remove(key: string): Promise<Result<void>> {
    try {
      await AsyncStorage.removeItem(key);
      return ok(undefined);
    } catch (cause) {
      log.error('remove failed', { key, cause });
      return err(AppError.storage(`remove(${key})`, cause));
    }
  }

  async getJSON<T>(key: string): Promise<Result<T | null>> {
    const raw = await this.getString(key);
    if (!raw.ok) return raw;
    if (raw.data === null) return ok(null);
    try {
      return ok(JSON.parse(raw.data) as T);
    } catch (cause) {
      // Corrupt payload: drop it so the next write starts clean.
      log.warn('getJSON found corrupt payload, dropping', { key, cause });
      await this.remove(key);
      return err(AppError.storage(`getJSON(${key}) malformed`, cause));
    }
  }

  async setJSON<T>(key: string, value: T): Promise<Result<void>> {
    try {
      return await this.setString(key, JSON.stringify(value));
    } catch (cause) {
      log.error('setJSON failed', { key, cause });
      return err(AppError.storage(`setJSON(${key})`, cause));
    }
  }

  async multiGet(keys: string[]): Promise<Result<Record<string, string | null>>> {
    try {
      const pairs = await AsyncStorage.multiGet(keys);
      const out: Record<string, string | null> = {};
      for (const [key, value] of pairs) out[key] = value;
      return ok(out);
    } catch (cause) {
      log.error('multiGet failed', { cause });
      return err(AppError.storage('multiGet', cause));
    }
  }

  async multiRemove(keys: string[]): Promise<Result<void>> {
    try {
      await AsyncStorage.multiRemove(keys);
      return ok(undefined);
    } catch (cause) {
      log.error('multiRemove failed', { cause });
      return err(AppError.storage('multiRemove', cause));
    }
  }

  async keys(): Promise<Result<string[]>> {
    try {
      const all = await AsyncStorage.getAllKeys();
      return ok(all.filter((key) => key.startsWith(`${STORAGE_NAMESPACE}:`)));
    } catch (cause) {
      log.error('keys failed', { cause });
      return err(AppError.storage('keys', cause));
    }
  }

  async clearAll(): Promise<Result<void>> {
    const scoped = await this.keys();
    if (!scoped.ok) return scoped;
    return this.multiRemove(scoped.data);
  }
}
