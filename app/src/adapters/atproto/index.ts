// Module: adapters/atproto
// Bluesky/ATProto adapter

import { AtpAgent } from '@atproto/api';
import type { AtpSessionData, AtpPersistSessionHandler } from '@atproto/api';
import type { IPostAdapter } from '../interfaces';

// ============================================================================
// Types
// ============================================================================

/**
 * Post data returned from Bluesky feed
 */
export interface Post {
  /** AT URI (e.g., at://did:plc:xxx/app.bsky.feed.post/3jxyz123abc) */
  uri: string;
  /** Post text content */
  text: string;
  /** ISO 8601 timestamp */
  createdAt: string;
  /** Whether post has media attachments (images, videos, or external links) */
  hasMedia: boolean;
  /** Author's handle (e.g., alice.bsky.social) */
  authorHandle: string;
  /** Author's DID (e.g., did:plc:xxx) */
  authorDid: string;
}

/**
 * Options for fetching author feed
 */
export interface GetAuthorFeedOptions {
  /** Maximum number of posts to fetch (default: 50) */
  limit?: number;
  /** Pagination cursor from previous response */
  cursor?: string;
}

/**
 * Options for creating a post
 */
export interface CreatePostOptions {
  /** Array of image data to attach */
  images?: Array<{
    data: Uint8Array;
    mimeType: string;
    alt?: string;
  }>;
}

/**
 * Response from getAuthorFeed with pagination support
 */
export interface AuthorFeedResponse {
  posts: Post[];
  cursor?: string;
}

// ============================================================================
// BlueskyAdapter
// ============================================================================

/**
 * Adapter for Bluesky/ATProto social network
 *
 * Provides authentication, post fetching, and post creation functionality
 * for the StegoChannel protocol.
 */
export class BlueskyAdapter implements IPostAdapter {
  private agent: AtpAgent;
  private sessionData: AtpSessionData | null = null;

  /**
   * Create a new Bluesky adapter
   *
   * @param service - PDS service URL (default: https://bsky.social)
   */
  constructor(service: string = 'https://bsky.social') {
    // Set up session persistence handler
    const persistSession: AtpPersistSessionHandler = (evt, session) => {
      if (evt === 'create' || evt === 'update') {
        this.sessionData = session ?? null;
      } else if (evt === 'expired' || evt === 'create-failed' || evt === 'network-error') {
        this.sessionData = null;
      }
    };

    this.agent = new AtpAgent({ service, persistSession });
  }

  // ==========================================================================
  // Authentication
  // ==========================================================================

  /**
   * Login with Bluesky account using app password
   *
   * IMPORTANT: Use an app password, NOT your main account password.
   * Generate app passwords at: https://bsky.app/settings/app-passwords
   *
   * @param identifier - Handle (alice.bsky.social) or email
   * @param appPassword - App-specific password
   * @throws Error if authentication fails
   */
  async login(identifier: string, appPassword: string): Promise<void> {
    try {
      await this.agent.login({ identifier, password: appPassword });
      // Session data is set via persistSession handler
    } catch (error) {
      // Check if this might be a main password attempt
      if (error instanceof Error && error.message.includes('Invalid identifier or password')) {
        throw new Error(
          'Authentication failed. If you used your main password, please create an app password instead. ' +
          'Generate one at: https://bsky.app/settings/app-passwords'
        );
      }
      throw error;
    }
  }

  /**
   * Logout and clear session
   */
  async logout(): Promise<void> {
    this.sessionData = null;
    // Note: AtpAgent doesn't have a logout method, session is just cleared locally
  }

  /**
   * Check if currently authenticated
   */
  isAuthenticated(): boolean {
    return this.sessionData !== null && this.agent.hasSession;
  }

  /**
   * Get current session data for persistence
   *
   * @returns Session data or null if not authenticated
   */
  getSession(): AtpSessionData | null {
    return this.sessionData;
  }

  /**
   * Resume session from previously saved session data
   *
   * @param session - Previously saved session data
   */
  async resumeSession(session: AtpSessionData): Promise<void> {
    await this.agent.resumeSession(session);
    this.sessionData = session;
  }

  // ==========================================================================
  // Post Fetching
  // ==========================================================================

  /**
   * Fetch posts from an author's feed with pagination
   *
   * @param handle - Author handle (e.g., alice.bsky.social) or DID
   * @param options - Fetch options (limit, cursor)
   * @returns Posts and optional cursor for pagination
   */
  async getAuthorFeed(
    handle: string,
    options: GetAuthorFeedOptions = {}
  ): Promise<AuthorFeedResponse> {
    const { limit = 50, cursor } = options;

    const response = await this.retryWithBackoff(async () => {
      return await this.agent.getAuthorFeed({
        actor: handle,
        limit,
        cursor,
      });
    });

    const posts: Post[] = response.data.feed.map((item) => {
      const post = item.post;
      const record = post.record as any; // Type assertion for post record

      // Check for media: images, videos, or external links
      // The embed field is a union type, so we check for existence
      const hasMedia = !!post.embed;

      return {
        uri: post.uri,
        text: record.text || '',
        createdAt: record.createdAt || post.indexedAt,
        hasMedia,
        authorHandle: post.author.handle,
        authorDid: post.author.did,
      };
    });

    return {
      posts,
      cursor: response.data.cursor,
    };
  }

  // ==========================================================================
  // Post Creation
  // ==========================================================================

  /**
   * Create a new post on Bluesky
   *
   * @param text - Post text content
   * @param options - Optional images to attach
   * @returns AT URI of created post
   */
  async createPost(text: string, options?: CreatePostOptions): Promise<string> {
    if (!this.isAuthenticated()) {
      throw new Error('Must be authenticated to create posts');
    }

    const record: any = {
      $type: 'app.bsky.feed.post',
      text,
      createdAt: new Date().toISOString(),
    };

    // Upload and attach images if provided
    if (options?.images && options.images.length > 0) {
      const uploadedImages = await Promise.all(
        options.images.map(async (img) => {
          const blob = await this.uploadImage(img.data, img.mimeType);
          return {
            alt: img.alt || '',
            image: blob,
          };
        })
      );

      record.embed = {
        $type: 'app.bsky.embed.images',
        images: uploadedImages,
      };
    }

    const response = await this.retryWithBackoff(async () => {
      return await this.agent.post(record);
    });

    return response.uri;
  }

  /**
   * Upload an image blob to Bluesky
   *
   * @param imageData - Image bytes
   * @param mimeType - MIME type (e.g., image/png, image/jpeg)
   * @returns Blob reference for use in posts
   */
  async uploadImage(imageData: Uint8Array, mimeType: string): Promise<any> {
    if (!this.isAuthenticated()) {
      throw new Error('Must be authenticated to upload images');
    }

    const response = await this.retryWithBackoff(async () => {
      return await this.agent.uploadBlob(imageData, { encoding: mimeType });
    });

    return response.data.blob;
  }

  // ==========================================================================
  // Utilities
  // ==========================================================================

  /**
   * Extract post ID (rkey) from AT URI for selection hashing
   *
   * @param atUri - AT URI (e.g., at://did:plc:xxx/app.bsky.feed.post/3jxyz123abc)
   * @returns Post ID/rkey (e.g., 3jxyz123abc)
   * @throws Error if URI format is invalid
   */
  static extractPostId(atUri: string): string {
    // AT URI format: at://did:plc:xxx/app.bsky.feed.post/RKEY
    const match = atUri.match(/at:\/\/[^\/]+\/[^\/]+\/([^\/]+)$/);
    if (!match) {
      throw new Error(`Invalid AT URI format: ${atUri}`);
    }
    return match[1];
  }

  /**
   * Instance method for IPostAdapter interface compliance.
   * Delegates to static extractPostId for backward compatibility.
   *
   * @param uri - AT URI string
   * @returns Post ID/rkey
   */
  extractPostId(uri: string): string {
    return BlueskyAdapter.extractPostId(uri);
  }

  /**
   * Retry operation with exponential backoff on rate limit errors
   *
   * Implements exponential backoff: 1s, 2s, 4s, 8s, 16s
   *
   * @param operation - Async operation to retry
   * @returns Result of operation
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 5
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        // Check if this is a rate limit error
        const isRateLimit =
          error instanceof Error &&
          (error.message.includes('rate limit') ||
            error.message.includes('429') ||
            (error as any).status === 429);

        if (!isRateLimit || attempt === maxRetries - 1) {
          throw error;
        }

        // Exponential backoff: 2^attempt seconds
        const delayMs = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    throw lastError || new Error('Retry failed');
  }
}
