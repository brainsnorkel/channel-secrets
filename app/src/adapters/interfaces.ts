// Module: adapters/interfaces
// Adapter abstractions for testability
//
// Design decisions:
// - IFeedAdapter is intentionally minimal (only fetchFeed). RSSAdapter.extractPostId
//   is an internal implementation detail (async, takes {guid, link} object) called
//   during parseFeed() -- never by external consumers.
// - extractPostId is on IPostAdapter only. BlueskyAdapter.extractPostId (sync, takes
//   AT URI string) is a fundamentally different operation from RSSAdapter.extractPostId.
// - IFeedAdapter.fetchFeed() return type is structurally compatible with RSSAdapter's
//   FeedResult type.

/**
 * Abstracts Bluesky-like post platforms.
 * Implemented by: BlueskyAdapter, MockBlueskyAdapter
 */
export interface IPostAdapter {
  getAuthorFeed(
    handle: string,
    options?: { limit?: number; cursor?: string }
  ): Promise<{
    posts: Array<{
      uri: string;
      text: string;
      createdAt: string;
      hasMedia: boolean;
      authorHandle: string;
      authorDid: string;
    }>;
    cursor?: string;
  }>;

  createPost(
    text: string,
    options?: {
      images?: Array<{ data: Uint8Array; mimeType: string; alt?: string }>;
    }
  ): Promise<string>;

  extractPostId(uri: string): string;
}

/**
 * Abstracts RSS/Atom-like feed sources.
 * Implemented by: RSSAdapter, MockRSSAdapter
 *
 * Intentionally minimal: only fetchFeed() is required.
 * RSSAdapter has additional methods (detectFeedType, parseFeed, extractText, hasMedia)
 * that are internal implementation details, not part of the interface contract.
 */
export interface IFeedAdapter {
  fetchFeed(
    url: string,
    options?: { etag?: string; lastModified?: string; proxyUrl?: string }
  ): Promise<{
    items: Array<{
      id: string;
      title: string;
      text: string;
      link: string;
      pubDate: Date;
      hasMedia: boolean;
      guid?: string;
    }>;
    etag?: string;
    lastModified?: string;
  }>;
}
