import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BlueskyAdapter } from './index';
import type { AtpSessionData } from '@atproto/api';

// Create a shared mock agent instance that will be set by the mock constructor
let mockAgentInstance: any;

// Mock the @atproto/api module
vi.mock('@atproto/api', () => {
  // Define mock class inside the factory to avoid hoisting issues
  return {
    AtpAgent: class MockAtpAgent {
      login = vi.fn();
      getAuthorFeed = vi.fn();
      post = vi.fn();
      uploadBlob = vi.fn();
      resumeSession = vi.fn();
      hasSession = false;
      persistSession: any;

      constructor(config: any) {
        // Store the persistSession handler for testing
        this.persistSession = config.persistSession;
        // Store reference to this instance for test assertions
        mockAgentInstance = this;
      }
    },
  };
});

describe('BlueskyAdapter', () => {
  let adapter: BlueskyAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the mock agent state
    mockAgentInstance = null;
    adapter = new BlueskyAdapter('https://bsky.social');
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Authentication', () => {
    describe('login', () => {
      it('successfully logs in with valid credentials', async () => {
        mockAgentInstance.login.mockResolvedValue({
          success: true,
          data: {
            did: 'did:plc:test123',
            handle: 'alice.bsky.social',
          },
        });

        await adapter.login('alice.bsky.social', 'app-password-1234');

        expect(mockAgentInstance.login).toHaveBeenCalledWith({
          identifier: 'alice.bsky.social',
          password: 'app-password-1234',
        });
        expect(mockAgentInstance.login).toHaveBeenCalledTimes(1);
      });

      it('throws enhanced error on invalid password with guidance', async () => {
        mockAgentInstance.login.mockRejectedValue(
          new Error('Invalid identifier or password')
        );

        await expect(
          adapter.login('alice.bsky.social', 'wrong-password')
        ).rejects.toThrow(
          'Authentication failed. If you used your main password, please create an app password instead'
        );
      });

      it('rethrows other authentication errors unchanged', async () => {
        mockAgentInstance.login.mockRejectedValue(new Error('Network timeout'));

        await expect(
          adapter.login('alice.bsky.social', 'app-password')
        ).rejects.toThrow('Network timeout');
      });
    });

    describe('logout', () => {
      it('clears session data', async () => {
        // Set up authenticated state
        mockAgentInstance.hasSession = true;
        (adapter as any).sessionData = {
          did: 'did:plc:test',
          handle: 'alice.bsky.social',
        };

        await adapter.logout();

        expect((adapter as any).sessionData).toBeNull();
        expect(adapter.isAuthenticated()).toBe(false);
      });
    });

    describe('isAuthenticated', () => {
      it('returns false when not authenticated', () => {
        expect(adapter.isAuthenticated()).toBe(false);
      });

      it('returns true when session exists and agent has session', () => {
        mockAgentInstance.hasSession = true;
        (adapter as any).sessionData = {
          did: 'did:plc:test',
          handle: 'alice.bsky.social',
        };

        expect(adapter.isAuthenticated()).toBe(true);
      });

      it('returns false when session data exists but agent has no session', () => {
        mockAgentInstance.hasSession = false;
        (adapter as any).sessionData = {
          did: 'did:plc:test',
          handle: 'alice.bsky.social',
        };

        expect(adapter.isAuthenticated()).toBe(false);
      });
    });

    describe('session management', () => {
      it('returns session data when authenticated', () => {
        const sessionData: AtpSessionData = {
          did: 'did:plc:test',
          handle: 'alice.bsky.social',
          email: 'alice@example.com',
          accessJwt: 'jwt-token',
          refreshJwt: 'refresh-token',
          active: true,
        };

        (adapter as any).sessionData = sessionData;

        expect(adapter.getSession()).toEqual(sessionData);
      });

      it('returns null when not authenticated', () => {
        expect(adapter.getSession()).toBeNull();
      });

      it('resumes session from saved data', async () => {
        const sessionData: AtpSessionData = {
          did: 'did:plc:test',
          handle: 'alice.bsky.social',
          email: 'alice@example.com',
          accessJwt: 'jwt-token',
          refreshJwt: 'refresh-token',
          active: true,
        };

        mockAgentInstance.resumeSession.mockResolvedValue({});

        await adapter.resumeSession(sessionData);

        expect(mockAgentInstance.resumeSession).toHaveBeenCalledWith(sessionData);
        expect((adapter as any).sessionData).toEqual(sessionData);
      });
    });
  });

  describe('Feed Fetching', () => {
    beforeEach(() => {
      // Set up authenticated state
      mockAgentInstance.hasSession = true;
      (adapter as any).sessionData = { did: 'did:plc:test' };
    });

    it('successfully fetches author feed', async () => {
      const mockFeedResponse = {
        data: {
          feed: [
            {
              post: {
                uri: 'at://did:plc:test/app.bsky.feed.post/3jxyz123',
                author: {
                  handle: 'alice.bsky.social',
                  did: 'did:plc:test',
                },
                record: {
                  text: 'Hello world!',
                  createdAt: '2026-02-06T12:00:00Z',
                },
                embed: { $type: 'app.bsky.embed.images' },
                indexedAt: '2026-02-06T12:00:01Z',
              },
            },
            {
              post: {
                uri: 'at://did:plc:test/app.bsky.feed.post/3jxyz456',
                author: {
                  handle: 'alice.bsky.social',
                  did: 'did:plc:test',
                },
                record: {
                  text: 'Another post',
                  createdAt: '2026-02-06T11:00:00Z',
                },
                indexedAt: '2026-02-06T11:00:01Z',
              },
            },
          ],
          cursor: 'next-page-cursor',
        },
      };

      mockAgentInstance.getAuthorFeed.mockResolvedValue(mockFeedResponse);

      const result = await adapter.getAuthorFeed('alice.bsky.social', {
        limit: 2,
      });

      expect(mockAgentInstance.getAuthorFeed).toHaveBeenCalledWith({
        actor: 'alice.bsky.social',
        limit: 2,
        cursor: undefined,
      });

      expect(result.posts).toHaveLength(2);
      expect(result.posts[0]).toEqual({
        uri: 'at://did:plc:test/app.bsky.feed.post/3jxyz123',
        text: 'Hello world!',
        createdAt: '2026-02-06T12:00:00Z',
        hasMedia: true,
        authorHandle: 'alice.bsky.social',
        authorDid: 'did:plc:test',
      });
      expect(result.posts[1].hasMedia).toBe(false);
      expect(result.cursor).toBe('next-page-cursor');
    });

    it('handles feed fetch with pagination cursor', async () => {
      mockAgentInstance.getAuthorFeed.mockResolvedValue({
        data: { feed: [], cursor: undefined },
      });

      await adapter.getAuthorFeed('alice.bsky.social', {
        limit: 10,
        cursor: 'existing-cursor',
      });

      expect(mockAgentInstance.getAuthorFeed).toHaveBeenCalledWith({
        actor: 'alice.bsky.social',
        limit: 10,
        cursor: 'existing-cursor',
      });
    });

    it('retries on rate limit error with exponential backoff', async () => {
      vi.useFakeTimers();

      const rateLimitError = Object.assign(new Error('Rate limit exceeded'), {
        status: 429,
      });

      // Fail 3 times, then succeed
      mockAgentInstance.getAuthorFeed
        .mockRejectedValueOnce(rateLimitError)
        .mockRejectedValueOnce(rateLimitError)
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValue({
          data: { feed: [], cursor: undefined },
        });

      const fetchPromise = adapter.getAuthorFeed('alice.bsky.social');

      // Advance through retry delays: 1s, 2s, 4s
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(2000);
      await vi.advanceTimersByTimeAsync(4000);

      const result = await fetchPromise;

      expect(mockAgentInstance.getAuthorFeed).toHaveBeenCalledTimes(4);
      expect(result.posts).toEqual([]);

      vi.useRealTimers();
    });

    it('stops retrying after max attempts on rate limit', async () => {
      vi.useFakeTimers();

      const rateLimitError = Object.assign(new Error('Rate limit exceeded'), {
        status: 429,
      });

      mockAgentInstance.getAuthorFeed.mockRejectedValue(rateLimitError);

      const fetchPromise = adapter.getAuthorFeed('alice.bsky.social');

      // Attach rejection handler early to prevent unhandled rejection
      // during timer advancement (the actual assertion follows)
      const caughtPromise = fetchPromise.catch((e: Error) => e);

      // Run all pending timers to completion
      await vi.runAllTimersAsync();

      const error = await caughtPromise;
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('Rate limit exceeded');
      expect(mockAgentInstance.getAuthorFeed).toHaveBeenCalledTimes(5);

      vi.useRealTimers();
    });

    it('does not retry on non-rate-limit errors', async () => {
      mockAgentInstance.getAuthorFeed.mockRejectedValue(new Error('Network error'));

      await expect(
        adapter.getAuthorFeed('alice.bsky.social')
      ).rejects.toThrow('Network error');

      expect(mockAgentInstance.getAuthorFeed).toHaveBeenCalledTimes(1);
    });
  });

  describe('Post Creation', () => {
    beforeEach(() => {
      // Set up authenticated state
      mockAgentInstance.hasSession = true;
      (adapter as any).sessionData = { did: 'did:plc:test' };
    });

    it('creates a text-only post successfully', async () => {
      mockAgentInstance.post.mockResolvedValue({
        uri: 'at://did:plc:test/app.bsky.feed.post/3jxyz789',
      });

      const uri = await adapter.createPost('Hello world!');

      expect(mockAgentInstance.post).toHaveBeenCalledWith({
        $type: 'app.bsky.feed.post',
        text: 'Hello world!',
        createdAt: expect.any(String),
      });
      expect(uri).toBe('at://did:plc:test/app.bsky.feed.post/3jxyz789');
    });

    it('creates a post with images', async () => {
      const imageData = new Uint8Array([1, 2, 3, 4]);
      const blobResponse = {
        data: {
          blob: {
            $type: 'blob',
            ref: { $link: 'bafyreib' },
            mimeType: 'image/png',
            size: 1234,
          },
        },
      };

      mockAgentInstance.uploadBlob.mockResolvedValue(blobResponse);
      mockAgentInstance.post.mockResolvedValue({
        uri: 'at://did:plc:test/app.bsky.feed.post/3jxyz999',
      });

      const uri = await adapter.createPost('Check out this image!', {
        images: [
          {
            data: imageData,
            mimeType: 'image/png',
            alt: 'Test image',
          },
        ],
      });

      expect(mockAgentInstance.uploadBlob).toHaveBeenCalledWith(imageData, {
        encoding: 'image/png',
      });
      expect(mockAgentInstance.post).toHaveBeenCalledWith({
        $type: 'app.bsky.feed.post',
        text: 'Check out this image!',
        createdAt: expect.any(String),
        embed: {
          $type: 'app.bsky.embed.images',
          images: [
            {
              alt: 'Test image',
              image: blobResponse.data.blob,
            },
          ],
        },
      });
      expect(uri).toBe('at://did:plc:test/app.bsky.feed.post/3jxyz999');
    });

    it('throws error when not authenticated', async () => {
      mockAgentInstance.hasSession = false;
      (adapter as any).sessionData = null;

      await expect(adapter.createPost('Hello')).rejects.toThrow(
        'Must be authenticated to create posts'
      );
    });

    it('does not retry on generic network errors', async () => {
      mockAgentInstance.post.mockRejectedValue(new Error('Network error'));

      await expect(adapter.createPost('Test post')).rejects.toThrow(
        'Network error'
      );

      // Should only try once (no retries for non-rate-limit errors)
      expect(mockAgentInstance.post).toHaveBeenCalledTimes(1);
    });
  });

  describe('Image Upload', () => {
    beforeEach(() => {
      mockAgentInstance.hasSession = true;
      (adapter as any).sessionData = { did: 'did:plc:test' };
    });

    it('uploads image successfully', async () => {
      const imageData = new Uint8Array([255, 216, 255, 224]); // JPEG header
      const blobResponse = {
        data: {
          blob: {
            $type: 'blob',
            ref: { $link: 'bafyreib123' },
            mimeType: 'image/jpeg',
            size: 4,
          },
        },
      };

      mockAgentInstance.uploadBlob.mockResolvedValue(blobResponse);

      const blob = await adapter.uploadImage(imageData, 'image/jpeg');

      expect(mockAgentInstance.uploadBlob).toHaveBeenCalledWith(imageData, {
        encoding: 'image/jpeg',
      });
      expect(blob).toEqual(blobResponse.data.blob);
    });

    it('throws error when not authenticated', async () => {
      mockAgentInstance.hasSession = false;
      (adapter as any).sessionData = null;

      await expect(
        adapter.uploadImage(new Uint8Array([1, 2, 3]), 'image/png')
      ).rejects.toThrow('Must be authenticated to upload images');
    });
  });

  describe('Utilities', () => {
    describe('extractPostId', () => {
      it('extracts post ID from valid AT URI', () => {
        const uri = 'at://did:plc:xyz123/app.bsky.feed.post/3jxyz123abc';
        const postId = BlueskyAdapter.extractPostId(uri);
        expect(postId).toBe('3jxyz123abc');
      });

      it('extracts post ID via instance method', () => {
        const uri = 'at://did:plc:xyz123/app.bsky.feed.post/3jxyz456def';
        const postId = adapter.extractPostId(uri);
        expect(postId).toBe('3jxyz456def');
      });

      it('throws error on invalid AT URI format', () => {
        expect(() =>
          BlueskyAdapter.extractPostId('https://bsky.app/profile/alice')
        ).toThrow('Invalid AT URI format');
      });

      it('throws error on malformed AT URI', () => {
        expect(() => BlueskyAdapter.extractPostId('at://incomplete')).toThrow(
          'Invalid AT URI format'
        );
      });
    });
  });

  describe('Session Persistence Handler', () => {
    it('updates session data on create event', () => {
      const newSession: AtpSessionData = {
        did: 'did:plc:new',
        handle: 'bob.bsky.social',
        email: 'bob@example.com',
        accessJwt: 'new-jwt',
        refreshJwt: 'new-refresh',
        active: true,
      };

      // Trigger the persist session handler
      const persistSession = mockAgentInstance.persistSession;
      if (persistSession) {
        persistSession('create', newSession);
      }

      expect((adapter as any).sessionData).toEqual(newSession);
    });

    it('updates session data on update event', () => {
      const updatedSession: AtpSessionData = {
        did: 'did:plc:updated',
        handle: 'alice.bsky.social',
        email: 'alice@example.com',
        accessJwt: 'updated-jwt',
        refreshJwt: 'updated-refresh',
        active: true,
      };

      const persistSession = mockAgentInstance.persistSession;
      if (persistSession) {
        persistSession('update', updatedSession);
      }

      expect((adapter as any).sessionData).toEqual(updatedSession);
    });

    it('clears session data on expired event', () => {
      (adapter as any).sessionData = { did: 'did:plc:test' };

      const persistSession = mockAgentInstance.persistSession;
      if (persistSession) {
        persistSession('expired', null);
      }

      expect((adapter as any).sessionData).toBeNull();
    });

    it('clears session data on create-failed event', () => {
      (adapter as any).sessionData = { did: 'did:plc:test' };

      const persistSession = mockAgentInstance.persistSession;
      if (persistSession) {
        persistSession('create-failed', null);
      }

      expect((adapter as any).sessionData).toBeNull();
    });

    it('clears session data on network-error event', () => {
      (adapter as any).sessionData = { did: 'did:plc:test' };

      const persistSession = mockAgentInstance.persistSession;
      if (persistSession) {
        persistSession('network-error', null);
      }

      expect((adapter as any).sessionData).toBeNull();
    });
  });
});
