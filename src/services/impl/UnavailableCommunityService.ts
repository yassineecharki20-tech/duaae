import { AppError } from '@/core/errors/AppError';
import { err, type Result } from '@/core/types/Result';
import { logger } from '@/core/utils/logger';
import { missingFirebaseVariables } from '@/core/config/env';
import type { CommunityPost, ReportPayload } from '@/core/types/domain';
import { translate } from '@/core/i18n/state';

import type {
  CommunityAuthorProfile,
  CommunityService,
  CommunitySort,
  FeedPage,
} from '../contracts/CommunityService';

const log = logger.child('community');

/**
 * Community without a backend — no fake feed, no fake likes, no fake profiles.
 *
 * Every call resolves to a `NOT_CONFIGURED` AppError. The community tab turns
 * that error into a designed empty state which explains precisely what has to
 * be connected. `onFeedChange` fires `onError` once so listeners can render
 * their "offline" affordance instead of waiting forever.
 *
 * Next stage: `FirestoreCommunityService` implements this interface over
 * `community/posts`, `users/{uid}/savedPosts` and `community/reports`.
 */
export class UnavailableCommunityService implements CommunityService {
  readonly isConfigured = false;

  private unavailable<T>(operation: string): Result<T> {
    log.info(`${operation} requested while the community backend is unconfigured`);
    return err(
      AppError.notConfigured(
        translate('community.screenTitle'),
        `CommunityService.${operation} needs Firestore. Missing env: ${missingFirebaseVariables().join(', ') || 'none'}`,
      ),
    );
  }

  async getFeed(_options?: {
    cursor?: string;
    limit?: number;
    sort?: CommunitySort;
  }): Promise<Result<FeedPage>> {
    return this.unavailable<FeedPage>('getFeed');
  }

  async getPost(_postId: string): Promise<Result<CommunityPost | null>> {
    return this.unavailable<CommunityPost | null>('getPost');
  }

  async createPost(_input: { body: string; duaId?: string }): Promise<Result<CommunityPost>> {
    return this.unavailable<CommunityPost>('createPost');
  }

  async deletePost(_postId: string): Promise<Result<void>> {
    return this.unavailable<void>('deletePost');
  }

  async like(_postId: string): Promise<Result<{ likeCount: number; likedByMe: boolean }>> {
    return this.unavailable('like');
  }

  async unlike(_postId: string): Promise<Result<{ likeCount: number; likedByMe: boolean }>> {
    return this.unavailable('unlike');
  }

  async save(_postId: string): Promise<Result<CommunityPost[]>> {
    return this.unavailable<CommunityPost[]>('save');
  }

  async unsave(_postId: string): Promise<Result<CommunityPost[]>> {
    return this.unavailable<CommunityPost[]>('unsave');
  }

  async getSavedPosts(): Promise<Result<CommunityPost[]>> {
    return this.unavailable<CommunityPost[]>('getSavedPosts');
  }

  async getProfile(_uid: string): Promise<Result<CommunityAuthorProfile | null>> {
    return this.unavailable<CommunityAuthorProfile | null>('getProfile');
  }

  async getPostsByAuthor(
    _uid: string,
    _options?: { cursor?: string; limit?: number },
  ): Promise<Result<FeedPage>> {
    return this.unavailable<FeedPage>('getPostsByAuthor');
  }

  async report(_payload: ReportPayload): Promise<Result<{ reportId: string }>> {
    return this.unavailable('report');
  }

  onFeedChange(_listener: (page: FeedPage) => void, onError: (error: unknown) => void): () => void {
    onError(AppError.notConfigured(translate('community.screenTitle'), 'onFeedChange has no backend to subscribe to.'));
    return () => undefined;
  }
}

export type { CommunityAuthorProfile, ReportPayload };
