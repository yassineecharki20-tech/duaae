import type { CommunityPost, ReportPayload } from '@/core/types/domain';
import type { Result } from '@/core/types/Result';

export interface FeedPage {
  posts: CommunityPost[];
  cursor: string | null;
  hasMore: boolean;
}

export interface CommunityAuthorProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
  bio?: string;
  joinedAt: string;
  postCount: number;
}

export type CommunitySort = 'latest' | 'most-liked';

/**
 * Community contract — full surface, zero fake data.
 *
 * `UnavailableCommunityService` returns `NOT_CONFIGURED` for every call, and the
 * community tab renders an honest empty state built from that error. Nothing in
 * the app fabricates posts, likes or profiles.
 *
 * The interfaces below are shaped so the Firestore implementation is a
 * straight mapping:
 *   feed            -> `community/posts` ordered by createdAt
 *   like/unlike     -> transaction on `likeCount` + `users/{uid}/likes`
 *   saved posts     -> `users/{uid}/savedPosts`
 *   reports         -> insert into `community/reports` (moderation queue)
 */
export interface CommunityService {
  readonly isConfigured: boolean;

  getFeed(options?: { cursor?: string; limit?: number; sort?: CommunitySort }): Promise<Result<FeedPage>>;
  getPost(postId: string): Promise<Result<CommunityPost | null>>;
  createPost(input: { body: string; duaId?: string }): Promise<Result<CommunityPost>>;
  deletePost(postId: string): Promise<Result<void>>;

  like(postId: string): Promise<Result<{ likeCount: number; likedByMe: boolean }>>;
  unlike(postId: string): Promise<Result<{ likeCount: number; likedByMe: boolean }>>;

  save(postId: string): Promise<Result<CommunityPost[]>>;
  unsave(postId: string): Promise<Result<CommunityPost[]>>;
  getSavedPosts(): Promise<Result<CommunityPost[]>>;

  getProfile(uid: string): Promise<Result<CommunityAuthorProfile | null>>;
  getPostsByAuthor(uid: string, options?: { cursor?: string; limit?: number }): Promise<Result<FeedPage>>;

  report(payload: ReportPayload): Promise<Result<{ reportId: string }>>;

  onFeedChange(listener: (page: FeedPage) => void, onError: (error: unknown) => void): () => void;
}
