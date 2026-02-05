// Module: adapters/mocks
// Mock adapters for testing

import type { IPostAdapter, IFeedAdapter } from './interfaces';
import { BlueskyAdapter } from './atproto';

/**
 * Mock Bluesky adapter for testing
 * Implements IPostAdapter with in-memory post storage
 */
export class MockBlueskyAdapter implements IPostAdapter {
  private posts: Array<{
    uri: string;
    text: string;
    createdAt: string;
    hasMedia: boolean;
    authorHandle: string;
    authorDid: string;
  }>;
  private rkeyCounter = 0;

  constructor(
    posts?: Array<{
      uri: string;
      text: string;
      createdAt: string;
      hasMedia: boolean;
      authorHandle: string;
      authorDid: string;
    }>
  ) {
    this.posts = posts ?? [];
  }

  async getAuthorFeed(
    _handle: string,
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
  }> {
    const limit = options?.limit ?? 50;
    return {
      posts: this.posts.slice(0, limit),
      cursor: undefined,
    };
  }

  async createPost(
    _text: string,
    _options?: {
      images?: Array<{ data: Uint8Array; mimeType: string; alt?: string }>;
    }
  ): Promise<string> {
    this.rkeyCounter++;
    const rkey = `mock-rkey-${String(this.rkeyCounter).padStart(3, '0')}`;
    return `at://did:plc:mock/app.bsky.feed.post/${rkey}`;
  }

  extractPostId(uri: string): string {
    return BlueskyAdapter.extractPostId(uri);
  }
}

/**
 * Mock RSS adapter for testing
 * Implements IFeedAdapter with in-memory feed items
 */
export class MockRSSAdapter implements IFeedAdapter {
  private items: Array<{
    id: string;
    title: string;
    text: string;
    link: string;
    pubDate: Date;
    hasMedia: boolean;
    guid?: string;
  }>;

  constructor(
    items?: Array<{
      id: string;
      title: string;
      text: string;
      link: string;
      pubDate: Date;
      hasMedia: boolean;
      guid?: string;
    }>
  ) {
    this.items = items ?? [];
  }

  async fetchFeed(
    _url: string,
    _options?: { etag?: string; lastModified?: string; proxyUrl?: string }
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
  }> {
    return {
      items: this.items,
      etag: undefined,
      lastModified: undefined,
    };
  }
}
