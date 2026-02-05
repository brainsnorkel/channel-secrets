import { describe, it, expect, beforeAll } from 'vitest';
import { detectSignalPosts } from './signal-detector';
import { isSignalPost } from '../protocol/selection';
import { createDeterministicEpochKey } from '../../test/fixtures';
import type { UnifiedPost } from './types';

describe('signal-detector', () => {
  let epochKey: Uint8Array;

  // We need the epoch key derived deterministically for all tests
  beforeAll(async () => {
    const result = await createDeterministicEpochKey();
    epochKey = result.epochKey;
  });

  /**
   * Helper: build a UnifiedPost with given id and defaults
   */
  function makePost(id: string, overrides?: Partial<UnifiedPost>): UnifiedPost {
    return {
      id,
      text: 'Test post content here.',
      timestamp: '2025-01-15T12:00:00Z',
      hasMedia: false,
      source: 'bluesky',
      sourceId: 'alice.bsky.social',
      ...overrides,
    };
  }

  /**
   * Helper: brute-force a signal post ID for the deterministic epoch key
   */
  async function findSignalPostId(rate: number = 0.25): Promise<string> {
    for (let i = 0; i < 10000; i++) {
      const id = `signal-${i}`;
      if (await isSignalPost(epochKey, id, rate)) {
        return id;
      }
    }
    throw new Error('Could not find signal post ID');
  }

  /**
   * Helper: brute-force a cover post ID
   */
  async function findCoverPostId(rate: number = 0.25): Promise<string> {
    for (let i = 0; i < 10000; i++) {
      const id = `cover-${i}`;
      if (!(await isSignalPost(epochKey, id, rate))) {
        return id;
      }
    }
    throw new Error('Could not find cover post ID');
  }

  // ---------------------------------------------------------------------------
  // Known signal posts detected
  // ---------------------------------------------------------------------------

  it('detects known signal posts', async () => {
    const signalId = await findSignalPostId();
    const coverId = await findCoverPostId();

    const posts = [makePost(signalId), makePost(coverId)];
    const detected = await detectSignalPosts(posts, epochKey, 0.25);

    // The signal post should be in the result
    const detectedIds = detected.map((p) => p.id);
    expect(detectedIds).toContain(signalId);
    expect(detectedIds).not.toContain(coverId);
  });

  // ---------------------------------------------------------------------------
  // Known cover posts rejected
  // ---------------------------------------------------------------------------

  it('rejects known cover posts', async () => {
    const coverId1 = await findCoverPostId();
    // Find a second one with a different prefix
    let coverId2 = '';
    for (let i = 0; i < 10000; i++) {
      const id = `extra-cover-${i}`;
      if (!(await isSignalPost(epochKey, id, 0.25))) {
        coverId2 = id;
        break;
      }
    }

    const posts = [makePost(coverId1), makePost(coverId2)];
    const detected = await detectSignalPosts(posts, epochKey, 0.25);

    expect(detected).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // Empty post array
  // ---------------------------------------------------------------------------

  it('returns empty for empty input', async () => {
    const detected = await detectSignalPosts([], epochKey, 0.25);
    expect(detected).toEqual([]);
  });

  // ---------------------------------------------------------------------------
  // Selection rate affects threshold
  // ---------------------------------------------------------------------------

  it('higher selection rate includes more posts', async () => {
    // Generate a batch of posts with sequential IDs
    const postIds = Array.from({ length: 100 }, (_, i) => `rate-test-${i}`);
    const posts = postIds.map((id) => makePost(id));

    const detected25 = await detectSignalPosts(posts, epochKey, 0.25);
    const detected75 = await detectSignalPosts(posts, epochKey, 0.75);

    // With 75% rate we should have ~3x more signal posts than with 25%
    expect(detected75.length).toBeGreaterThan(detected25.length);
  });

  // ---------------------------------------------------------------------------
  // Rate=0 selects no posts
  // ---------------------------------------------------------------------------

  it('rate near zero selects no posts', async () => {
    // Generate a batch of posts
    const posts = Array.from({ length: 20 }, (_, i) => makePost(`zero-rate-${i}`));
    const detected = await detectSignalPosts(posts, epochKey, 0.0001);
    // With rate ~0, extremely unlikely any post is selected from 20
    expect(detected.length).toBeLessThanOrEqual(1);
  });
});
