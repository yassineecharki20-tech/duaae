import { create } from 'zustand';

import type { AzkarSession, DuaCategory } from '@/core/types/domain';
import { AppError } from '@/core/errors/AppError';
import { services } from '@/services/registry';
import { CONTENT_STATS } from '@/data/content';

export type ContentStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface ContentStoreState {
  status: ContentStatus;
  categories: DuaCategory[];
  sessions: AzkarSession[];
  error: AppError | null;
  /** Version stamp of the active corpus — surfaced in About for transparency. */
  version: string;
  source: 'bundled' | 'cache' | 'remote';
  hydrate(): Promise<void>;
}

let hydratePromise: Promise<void> | null = null;

/**
 * Content bootstrap.
 *
 * The corpus itself is imported synchronously by the data layer, so screens can
 * render even if this store never hydrates; the store exists to give the UI a
 * single loading/error/ready signal for the async surface (and later, the
 * remote-first implementation).
 */
export const useContentStore = create<ContentStoreState>()((set, get) => ({
  status: 'idle',
  categories: [],
  sessions: [],
  error: null,
  version: CONTENT_STATS.version,
  source: 'bundled',

  hydrate: async () => {
    if (get().status === 'ready' || get().status === 'loading') return;
    set({ status: 'loading', error: null });

    if (!hydratePromise) {
      hydratePromise = (async () => {
        const [categories, sessions] = await Promise.all([
          services.content().listCategories(),
          services.content().listSessions(),
        ]);

        if (!categories.ok) {
          set({ status: 'error', error: categories.error });
          return;
        }
        if (!sessions.ok) {
          set({ status: 'error', error: sessions.error });
          return;
        }
        set({
          status: 'ready',
          categories: categories.data,
          sessions: sessions.data,
          source: services.content().source,
          version: services.content().version,
          error: null,
        });
      })().finally(() => {
        hydratePromise = null;
      });
    }
    return hydratePromise;
  },
}));
