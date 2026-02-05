import { describe, it, expect } from 'vitest';
import { extractBits } from './bit-extractor';
import { extractFeatures, type FeatureId } from '../protocol/features';
import type { UnifiedPost } from './types';

describe('bit-extractor', () => {
  // Standard feature set for tests
  const featureSet: FeatureId[] = ['len', 'media', 'qmark'];
  const lengthThreshold = 50;

  /**
   * Helper: build a UnifiedPost
   */
  function makePost(overrides?: Partial<UnifiedPost>): UnifiedPost {
    return {
      id: `post-${Math.random().toString(36).slice(2, 8)}`,
      text: 'This is a test post with some content here.',
      timestamp: '2025-01-15T12:00:00Z',
      hasMedia: false,
      source: 'bluesky',
      sourceId: 'alice.bsky.social',
      ...overrides,
    };
  }

  // ---------------------------------------------------------------------------
  // Extracts correct bits from signal posts
  // ---------------------------------------------------------------------------

  it('extracts correct bits from signal posts', async () => {
    const post = makePost({
      id: 'bit-test-1',
      text: 'Short',          // < 50 chars => len=0
      hasMedia: true,          // media=1
      timestamp: '2025-01-15T12:00:00Z',
    });

    const bits = await extractBits([post], featureSet, lengthThreshold);

    // extractFeatures('Short', true, ['len','media','qmark'], 50) should give:
    // len: 0 (short text), media: 1 (has media), qmark: 0 (no question mark)
    const expected = extractFeatures('Short', true, featureSet, lengthThreshold);
    expect(bits).toEqual(expected.bits);
  });

  it('extracts bits respecting feature set order', async () => {
    const post = makePost({
      id: 'bit-order-1',
      text: 'Is this a question? I think it is and it has quite a lot of characters to exceed the threshold easily',
      hasMedia: false,
      timestamp: '2025-01-15T12:00:00Z',
    });

    const bits = await extractBits([post], featureSet, lengthThreshold);

    // len: 1 (long text), media: 0, qmark: 1 (has ?)
    expect(bits).toEqual([1, 0, 1]);
  });

  // ---------------------------------------------------------------------------
  // Posts sorted chronologically
  // ---------------------------------------------------------------------------

  it('sorts posts chronologically before extracting bits', async () => {
    // Post A is later but listed first
    const postA = makePost({
      id: 'chrono-a',
      text: 'Short A',        // len=0, media=0, qmark=0 => [0,0,0]
      hasMedia: false,
      timestamp: '2025-01-15T14:00:00Z',
    });

    // Post B is earlier but listed second
    const postB = makePost({
      id: 'chrono-b',
      text: 'Is this a question? It has quite a lot of characters here to exceed the limit definitely yes',
      hasMedia: true,          // len=1, media=1, qmark=1 => [1,1,1]
      timestamp: '2025-01-15T10:00:00Z',
    });

    const bits = await extractBits([postA, postB], featureSet, lengthThreshold);

    // B should come first (earlier timestamp), then A
    const bitsB = extractFeatures(postB.text, postB.hasMedia, featureSet, lengthThreshold).bits;
    const bitsA = extractFeatures(postA.text, postA.hasMedia, featureSet, lengthThreshold).bits;
    expect(bits).toEqual([...bitsB, ...bitsA]);
  });

  // ---------------------------------------------------------------------------
  // Deduplication: same text produces same dedup key
  // ---------------------------------------------------------------------------

  it('deduplicates posts with same normalized text, bits, and time bucket', async () => {
    const post1 = makePost({
      id: 'dup-1',
      text: 'Identical content here',
      hasMedia: false,
      timestamp: '2025-01-15T12:00:00Z',
    });

    const post2 = makePost({
      id: 'dup-2',
      text: 'Identical content here',  // same text
      hasMedia: false,                   // same features
      timestamp: '2025-01-15T12:30:00Z', // same hour bucket
    });

    const bitsDeduped = await extractBits([post1, post2], featureSet, lengthThreshold);
    const bitsSingle = await extractBits([post1], featureSet, lengthThreshold);

    // Should be same because post2 is a duplicate
    expect(bitsDeduped).toEqual(bitsSingle);
  });

  // ---------------------------------------------------------------------------
  // Different text produces different dedup key
  // ---------------------------------------------------------------------------

  it('does not deduplicate posts with different text', async () => {
    const post1 = makePost({
      id: 'diff-1',
      text: 'First unique post',
      hasMedia: false,
      timestamp: '2025-01-15T12:00:00Z',
    });

    const post2 = makePost({
      id: 'diff-2',
      text: 'Second unique post',
      hasMedia: false,
      timestamp: '2025-01-15T12:30:00Z',
    });

    const bitsBoth = await extractBits([post1, post2], featureSet, lengthThreshold);
    const bitsSingle = await extractBits([post1], featureSet, lengthThreshold);

    // Both posts contribute bits
    expect(bitsBoth.length).toBeGreaterThan(bitsSingle.length);
  });

  // ---------------------------------------------------------------------------
  // Different time buckets are not deduped
  // ---------------------------------------------------------------------------

  it('does not deduplicate posts in different time buckets', async () => {
    const post1 = makePost({
      id: 'bucket-1',
      text: 'Same text for bucket test',
      hasMedia: false,
      timestamp: '2025-01-15T12:00:00Z',
    });

    const post2 = makePost({
      id: 'bucket-2',
      text: 'Same text for bucket test',
      hasMedia: false,
      timestamp: '2025-01-15T14:00:00Z', // 2 hours later = different bucket
    });

    const bitsBoth = await extractBits([post1, post2], featureSet, lengthThreshold);
    const bitsSingle = await extractBits([post1], featureSet, lengthThreshold);

    // Different time buckets => not deduped => more bits
    expect(bitsBoth.length).toBeGreaterThan(bitsSingle.length);
  });

  // ---------------------------------------------------------------------------
  // Empty input
  // ---------------------------------------------------------------------------

  it('returns empty bits for empty input', async () => {
    const bits = await extractBits([], featureSet, lengthThreshold);
    expect(bits).toEqual([]);
  });
});
