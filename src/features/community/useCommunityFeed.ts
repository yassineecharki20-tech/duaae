import { useCallback, useEffect, useState } from 'react';

import type { AppError } from '@/core/errors/AppError';
import { isAppError } from '@/core/errors/AppError';
import type { CommunityPost } from '@/core/types/domain';
import { services } from '@/services/registry';

export type CommunityFeedStatus = 'loading' | 'ready' | 'unavailable' | 'error';

export interface CommunityFeedState {
  posts: CommunityPost[];
  status: CommunityFeedStatus;
  error: AppError | null;
  isConfigured: boolean;
  hasMore: boolean;
  refresh(): void;
}

/**
 * Community feed loader.
 *
 * With no backend configured this resolves to `unavailable` carrying the real
 * `NOT_CONFIGURED` AppError, and the screen explains it plainly. There is no
 * seeded or fabricated post data anywhere in the app.
 */
export function useCommunityFeed(): CommunityFeedState {
  const community = services.community();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [status, setStatus] = useState<CommunityFeedStatus>('loading');
  const [error, setError] = useState<AppError | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nonce, setNonce] = useState(0);

  // Status changes on the user action, not inside the effect (avoids a
  // redundant render pass every time the feed mounts).
  const refresh = useCallback(() => {
    setStatus('loading');
    setNonce((value) => value + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const result = await community.getFeed({ limit: 20, sort: 'latest' });
      if (cancelled) return;
      if (result.ok) {
        setPosts(result.data.posts);
        setHasMore(result.data.hasMore);
        setError(null);
        setStatus('ready');
        return;
      }
      const appError = isAppError(result.error) ? result.error : null;
      setPosts([]);
      setHasMore(false);
      setError(appError);
      setStatus(appError?.code === 'NOT_CONFIGURED' ? 'unavailable' : 'error');
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [community, nonce]);

  return { posts, status, error, isConfigured: community.isConfigured, hasMore, refresh };
}
