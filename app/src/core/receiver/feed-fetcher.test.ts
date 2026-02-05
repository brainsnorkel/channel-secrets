import { describe, it, expect } from 'vitest';
import { fetchPosts, fetchBlueskyPosts, fetchRSSPosts } from './feed-fetcher';
import { MockBlueskyAdapter, MockRSSAdapter } from '../../adapters/mocks';
import type { Source } from './types';

describe('feed-fetcher', () => {
  // ---------------------------------------------------------------------------
  // Bluesky fetching
  // ---------------------------------------------------------------------------

  it('fetches posts from MockBlueskyAdapter and maps to UnifiedPost', async () => {
    const adapter = new MockBlueskyAdapter([
      {
        uri: 'at://did:plc:abc/app.bsky.feed.post/rkey1',
        text: 'Hello world',
        createdAt: '2025-01-15T12:00:00Z',
        hasMedia: false,
        authorHandle: 'alice.bsky.social',
        authorDid: 'did:plc:abc',
      },
      {
        uri: 'at://did:plc:abc/app.bsky.feed.post/rkey2',
        text: 'Second post with image',
        createdAt: '2025-01-15T13:00:00Z',
        hasMedia: true,
        authorHandle: 'alice.bsky.social',
        authorDid: 'did:plc:abc',
      },
    ]);

    const sources: Source[] = [{ type: 'bluesky', identifier: 'alice.bsky.social' }];
    const posts = await fetchPosts(sources, { bluesky: adapter });

    expect(posts).toHaveLength(2);
    expect(posts[0]).toEqual({
      id: 'rkey1',
      text: 'Hello world',
      timestamp: '2025-01-15T12:00:00Z',
      hasMedia: false,
      source: 'bluesky',
      sourceId: 'alice.bsky.social',
    });
    expect(posts[1].id).toBe('rkey2');
    expect(posts[1].hasMedia).toBe(true);
    expect(posts[1].source).toBe('bluesky');
  });

  // ---------------------------------------------------------------------------
  // RSS fetching
  // ---------------------------------------------------------------------------

  it('fetches posts from MockRSSAdapter and maps to UnifiedPost', async () => {
    const adapter = new MockRSSAdapter([
      {
        id: 'rss-item-1',
        title: 'Blog Post 1',
        text: 'Content of blog post one.',
        link: 'https://example.com/post1',
        pubDate: new Date('2025-01-15T10:00:00Z'),
        hasMedia: false,
      },
    ]);

    const sources: Source[] = [{ type: 'rss', identifier: 'https://example.com/feed.xml' }];
    const posts = await fetchPosts(sources, { rss: adapter });

    expect(posts).toHaveLength(1);
    expect(posts[0]).toEqual({
      id: 'rss-item-1',
      text: 'Content of blog post one.',
      timestamp: '2025-01-15T10:00:00.000Z',
      hasMedia: false,
      source: 'rss',
      sourceId: 'https://example.com/feed.xml',
    });
  });

  // ---------------------------------------------------------------------------
  // No adapters configured
  // ---------------------------------------------------------------------------

  it('returns empty array when no adapters configured', async () => {
    const sources: Source[] = [
      { type: 'bluesky', identifier: 'alice.bsky.social' },
      { type: 'rss', identifier: 'https://example.com/feed.xml' },
    ];
    // Pass no adapters -- both should warn and continue
    const posts = await fetchPosts(sources, {});

    expect(posts).toEqual([]);
  });

  // ---------------------------------------------------------------------------
  // Adapter failure is handled gracefully
  // ---------------------------------------------------------------------------

  it('handles adapter failure gracefully and returns posts from working sources', async () => {
    // Bluesky adapter that throws
    const badBluesky: any = {
      getAuthorFeed: () => {
        throw new Error('Network error');
      },
      extractPostId: (uri: string) => uri.split('/').pop() ?? uri,
    };

    const goodRss = new MockRSSAdapter([
      {
        id: 'rss-ok',
        title: 'OK',
        text: 'This works',
        link: 'https://example.com/ok',
        pubDate: new Date('2025-01-15T11:00:00Z'),
        hasMedia: false,
      },
    ]);

    const sources: Source[] = [
      { type: 'bluesky', identifier: 'bad.handle' },
      { type: 'rss', identifier: 'https://example.com/feed.xml' },
    ];

    const posts = await fetchPosts(sources, { bluesky: badBluesky, rss: goodRss });

    // Only the RSS post should come through
    expect(posts).toHaveLength(1);
    expect(posts[0].id).toBe('rss-ok');
  });

  // ---------------------------------------------------------------------------
  // Direct helper: fetchBlueskyPosts throws without adapter
  // ---------------------------------------------------------------------------

  it('fetchBlueskyPosts throws when adapter is undefined', async () => {
    await expect(fetchBlueskyPosts('alice.bsky.social')).rejects.toThrow(
      'Bluesky adapter not configured'
    );
  });

  // ---------------------------------------------------------------------------
  // Direct helper: fetchRSSPosts throws without adapter
  // ---------------------------------------------------------------------------

  it('fetchRSSPosts throws when adapter is undefined', async () => {
    await expect(fetchRSSPosts('https://example.com/feed.xml')).rejects.toThrow(
      'RSS adapter not configured'
    );
  });

  // ---------------------------------------------------------------------------
  // Multi-source aggregation
  // ---------------------------------------------------------------------------

  it('aggregates posts from multiple sources', async () => {
    const bsky = new MockBlueskyAdapter([
      {
        uri: 'at://did:plc:x/app.bsky.feed.post/rk1',
        text: 'Bluesky post',
        createdAt: '2025-01-15T12:00:00Z',
        hasMedia: false,
        authorHandle: 'alice.bsky.social',
        authorDid: 'did:plc:x',
      },
    ]);

    const rss = new MockRSSAdapter([
      {
        id: 'rss-1',
        title: 'RSS',
        text: 'RSS post',
        link: 'https://blog.example.com/1',
        pubDate: new Date('2025-01-15T09:00:00Z'),
        hasMedia: true,
      },
    ]);

    const sources: Source[] = [
      { type: 'bluesky', identifier: 'alice.bsky.social' },
      { type: 'rss', identifier: 'https://blog.example.com/feed' },
    ];

    const posts = await fetchPosts(sources, { bluesky: bsky, rss });

    expect(posts).toHaveLength(2);
    const sources_found = posts.map((p) => p.source);
    expect(sources_found).toContain('bluesky');
    expect(sources_found).toContain('rss');
  });
});
