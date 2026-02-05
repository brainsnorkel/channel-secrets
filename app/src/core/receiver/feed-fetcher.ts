// Module: core/receiver/feed-fetcher
// Feed fetching from Bluesky and RSS sources

import type { IPostAdapter, IFeedAdapter } from '../../adapters/interfaces';
import type { UnifiedPost, Source } from './types';

/**
 * Adapters required for feed fetching
 */
export interface FeedAdapters {
  bluesky?: IPostAdapter;
  rss?: IFeedAdapter;
}

/**
 * Fetch posts from all configured sources
 *
 * @param sources - Array of sources to fetch from
 * @param adapters - Platform adapters
 * @returns Unified array of posts from all sources
 */
export async function fetchPosts(
  sources: Source[],
  adapters: FeedAdapters
): Promise<UnifiedPost[]> {
  const allPosts: UnifiedPost[] = [];

  await Promise.all(
    sources.map(async (source) => {
      try {
        if (source.type === 'bluesky') {
          const posts = await fetchBlueskyPosts(source.identifier, adapters.bluesky);
          allPosts.push(...posts);
        } else if (source.type === 'rss') {
          const posts = await fetchRSSPosts(source.identifier, adapters.rss);
          allPosts.push(...posts);
        }
      } catch (error) {
        console.warn(`Failed to fetch from ${source.type} ${source.identifier}:`, error);
        // Continue with other sources
      }
    })
  );

  return allPosts;
}

/**
 * Fetch posts from a Bluesky handle
 *
 * @param handle - Bluesky handle to fetch from
 * @param adapter - Bluesky post adapter
 * @returns Array of unified posts
 */
export async function fetchBlueskyPosts(
  handle: string,
  adapter?: IPostAdapter
): Promise<UnifiedPost[]> {
  if (!adapter) {
    throw new Error('Bluesky adapter not configured');
  }

  const response = await adapter.getAuthorFeed(handle, { limit: 50 });

  return response.posts.map((post) => ({
    id: adapter.extractPostId(post.uri),
    text: post.text,
    timestamp: post.createdAt,
    hasMedia: post.hasMedia,
    source: 'bluesky' as const,
    sourceId: handle,
  }));
}

/**
 * Fetch posts from an RSS feed URL
 *
 * @param feedUrl - RSS feed URL to fetch from
 * @param adapter - RSS feed adapter
 * @returns Array of unified posts
 */
export async function fetchRSSPosts(
  feedUrl: string,
  adapter?: IFeedAdapter
): Promise<UnifiedPost[]> {
  if (!adapter) {
    throw new Error('RSS adapter not configured');
  }

  const result = await adapter.fetchFeed(feedUrl);

  return result.items.map((item) => ({
    id: item.id,
    text: item.text,
    timestamp: item.pubDate.toISOString(),
    hasMedia: item.hasMedia,
    source: 'rss' as const,
    sourceId: feedUrl,
  }));
}
