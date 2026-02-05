// Module: core/__tests__/protocol-integration
// Full end-to-end integration tests for the StegoChannel protocol.
// Proves: sender encodes message -> signal posts carry bits via feature extraction
//       -> receiver detects signal posts, extracts bits, decodes frame -> original message recovered.

import { describe, it, expect, vi, beforeAll } from 'vitest';
import { buildMessageFrame } from '../sender/message-builder';
import { frameToBits } from '../protocol/framing';
import { isSignalPost } from '../protocol/selection';
import { detectSignalPosts } from '../receiver/signal-detector';
import { extractBits } from '../receiver/bit-extractor';
import { tryDecodeMessage, deriveEpochKeysForGracePeriod } from '../receiver/frame-decoder';
import { deriveEpochKey } from '../crypto';
import { createDeterministicEpochKey } from '../../test/fixtures';
import type { UnifiedPost } from '../receiver/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Find a post ID that passes isSignalPost for the given epochKey and rate,
 * using a unique search prefix to avoid collisions across calls.
 * Returns a UnifiedPost-compatible object whose features encode the target bits.
 *
 * targetBits: [len, media, qmark] — 3 bits per signal post.
 * postIndex: unique index per post, embedded in text to avoid deduplication.
 *
 * extractBits deduplicates by SHA256(normalizedText + bits + hourBucket), so
 * posts with identical features in the same hour would be collapsed. Including
 * the postIndex in the text body makes each post's dedup key unique.
 */
async function findSignalPostWithFeatures(
  epochKey: Uint8Array,
  targetBits: number[],
  searchOffset: number,
  postIndex: number,
  rate: number = 0.25,
): Promise<{ id: string; text: string; hasMedia: boolean }> {
  // Determine required features from target bits
  const needLongText = targetBits[0] === 1; // len bit
  const needMedia = targetBits[1] === 1;     // media bit
  const needQuestion = targetBits[2] === 1;  // qmark bit

  // Craft text with the right features, including postIndex for dedup uniqueness
  const tag = `n${postIndex}`;
  let text: string;
  if (needLongText) {
    // >= 50 graphemes
    text = needQuestion
      ? `This is a much longer post that definitely exceeds the fifty character threshold ${tag}?`
      : `This is a much longer post that definitely exceeds the fifty character threshold ${tag} ok`;
  } else {
    // < 50 graphemes
    text = needQuestion ? `Hey ${tag}?` : `Hey ${tag}`;
  }
  const hasMedia = needMedia;

  // Brute-force post IDs starting from searchOffset to find one that is a signal post
  for (let i = searchOffset; i < searchOffset + 100000; i++) {
    const id = `integ-${i}`;
    if (await isSignalPost(epochKey, id, rate)) {
      return { id, text, hasMedia };
    }
  }
  throw new Error(`Failed to find signal post ID starting from offset ${searchOffset}`);
}

/**
 * Build an array of UnifiedPost objects that collectively carry the given frameBits.
 * Each signal post encodes 3 bits (len, media, qmark).
 * Posts have monotonically increasing timestamps to preserve bit order after sorting.
 *
 * Only complete 3-bit chunks are used. If frameBits.length is not a multiple of 3,
 * the trailing 1-2 bits are omitted — RS error correction (up to 4 symbol errors)
 * handles the resulting 1 symbol error in the last byte.
 */
async function buildSignalPosts(
  frameBits: number[],
  epochKey: Uint8Array,
  rate: number = 0.25,
): Promise<UnifiedPost[]> {
  const posts: UnifiedPost[] = [];
  const bitsPerPost = 3; // [len, media, qmark]
  let globalSearchOffset = 0; // ensures unique IDs across posts

  // Only create posts for complete 3-bit chunks.
  // Remaining 1-2 bits become zero-padding in the last byte, which RS corrects.
  const fullChunks = Math.floor(frameBits.length / bitsPerPost);

  for (let chunkIdx = 0; chunkIdx < fullChunks; chunkIdx++) {
    const i = chunkIdx * bitsPerPost;
    const chunk = frameBits.slice(i, i + bitsPerPost);

    const { id, text, hasMedia } = await findSignalPostWithFeatures(
      epochKey,
      chunk,
      globalSearchOffset,
      chunkIdx,
      rate,
    );

    // Advance search offset past the found ID to guarantee uniqueness
    const foundIndex = parseInt(id.replace('integ-', ''), 10);
    globalSearchOffset = foundIndex + 1;

    // Incrementing timestamps: each post 1 minute apart for chronological ordering.
    // Text is already unique per post (contains postIndex), preventing dedup collisions.
    const timestamp = new Date(Date.UTC(2025, 0, 15, 12, chunkIdx, 0)).toISOString();

    posts.push({
      id,
      text,
      hasMedia,
      timestamp,
      source: 'bluesky',
      sourceId: 'test.bsky.social',
    });
  }

  return posts;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Protocol Integration', { timeout: 60000 }, () => {
  let epochKey: Uint8Array;
  let channelKey: Uint8Array;

  beforeAll(async () => {
    const result = await createDeterministicEpochKey();
    epochKey = result.epochKey;
    channelKey = result.channelKey;
  });

  // -------------------------------------------------------------------------
  // 7.1: Full send-receive cycle (plaintext)
  // -------------------------------------------------------------------------
  it('full send-receive cycle with known key (plaintext)', async () => {
    // 1. Sender: encode message into frame bits
    const message = 'Hello StegoChannel';
    const payload = new TextEncoder().encode(message);
    const { frameBits } = await buildMessageFrame(payload, epochKey, false, 0);

    // 2. Build signal posts that carry the frame bits
    const signalPosts = await buildSignalPosts(frameBits, epochKey);

    // 3. Receiver: detect signal posts (all should be detected since all are signal posts)
    const detected = await detectSignalPosts(signalPosts, epochKey, 0.25);
    expect(detected.length).toBe(signalPosts.length);

    // 4. Receiver: extract bits from detected signal posts
    const extractedBits = await extractBits(detected, ['len', 'media', 'qmark'], 50);

    // 5. Receiver: decode message from bits
    const decoded = await tryDecodeMessage(extractedBits, epochKey, 0);

    // 6. Verify round-trip
    expect(decoded).not.toBeNull();
    expect(decoded!.version).toBe(0);
    expect(decoded!.encrypted).toBe(false);
    expect(new TextDecoder().decode(decoded!.payload)).toBe(message);
  });

  // -------------------------------------------------------------------------
  // 7.2: Full send-receive cycle (encrypted)
  // -------------------------------------------------------------------------
  it('full send-receive cycle with encryption', async () => {
    const message = 'Secret message';
    const payload = new TextEncoder().encode(message);
    const { frameBits } = await buildMessageFrame(payload, epochKey, true, 0);

    const signalPosts = await buildSignalPosts(frameBits, epochKey);
    const detected = await detectSignalPosts(signalPosts, epochKey, 0.25);
    expect(detected.length).toBe(signalPosts.length);

    const extractedBits = await extractBits(detected, ['len', 'media', 'qmark'], 50);
    const decoded = await tryDecodeMessage(extractedBits, epochKey, 0);

    expect(decoded).not.toBeNull();
    expect(decoded!.encrypted).toBe(true);
    expect(new TextDecoder().decode(decoded!.payload)).toBe(message);
  });

  // -------------------------------------------------------------------------
  // 7.3: Epoch boundary handling with grace period
  // -------------------------------------------------------------------------
  it('handles epoch boundary with grace period', async () => {
    // For date beacons, deriveEpochKeysForGracePeriod uses new Date() directly
    // and formatDateBeacon — no getBeaconValue call. So we only need fake timers.
    vi.useFakeTimers();

    try {
      // Set time to Jan 15 (message is sent on this date)
      vi.setSystemTime(new Date('2025-01-15T23:50:00Z'));

      // Derive epoch key for Jan 15
      const jan15Key = await deriveEpochKey(channelKey, 'date', '2025-01-15');

      // Sender: encode message using Jan 15 epoch key
      const message = 'Epoch boundary test';
      const payload = new TextEncoder().encode(message);
      const { frameBits } = await buildMessageFrame(payload, jan15Key, false, 0);
      const signalPosts = await buildSignalPosts(frameBits, jan15Key);

      // Time crosses to Jan 16
      vi.setSystemTime(new Date('2025-01-16T00:05:00Z'));

      // Receiver calls deriveEpochKeysForGracePeriod which should try both
      // Jan 16 (current) AND Jan 15 (grace period for date beacon, epochsToCheck=1)
      const epochKeys = await deriveEpochKeysForGracePeriod(channelKey, 'date');

      // Should have 2 epoch keys: current date + 1 previous
      expect(epochKeys.length).toBe(2);
      expect(epochKeys[0].beaconValue).toBe('2025-01-16');
      expect(epochKeys[1].beaconValue).toBe('2025-01-15');

      // The Jan 15 key should allow decoding
      const detected = await detectSignalPosts(signalPosts, epochKeys[1].epochKey, 0.25);
      const extractedBits = await extractBits(detected, ['len', 'media', 'qmark'], 50);
      const decoded = await tryDecodeMessage(extractedBits, epochKeys[1].epochKey, 0);

      expect(decoded).not.toBeNull();
      expect(new TextDecoder().decode(decoded!.payload)).toBe(message);
    } finally {
      vi.useRealTimers();
    }
  });

  // -------------------------------------------------------------------------
  // 7.4: Reed-Solomon error correction
  // -------------------------------------------------------------------------
  describe('Reed-Solomon error correction', () => {
    it('corrects up to 4 symbol errors', async () => {
      const message = 'RS error test';
      const payload = new TextEncoder().encode(message);
      const { frame } = await buildMessageFrame(payload, epochKey, false, 0);

      // frame is RS-encoded (encodeFrame applies rsEncode with 8 ECC symbols)
      // Introduce 3 byte errors (within RS tolerance of 4 symbols)
      const corrupted = new Uint8Array(frame);
      corrupted[5] ^= 0xFF;  // Flip all bits of byte 5
      corrupted[10] ^= 0xAA; // Flip some bits of byte 10
      corrupted[15] ^= 0x55; // Flip some bits of byte 15

      // Convert corrupted frame to bits
      const corruptedBits = frameToBits(corrupted);

      // Receiver should still decode correctly (RS corrects the errors)
      const decoded = await tryDecodeMessage(corruptedBits, epochKey, 0);
      expect(decoded).not.toBeNull();
      expect(new TextDecoder().decode(decoded!.payload)).toBe(message);
    });

    it('fails gracefully beyond tolerance', async () => {
      const message = 'RS fail test';
      const payload = new TextEncoder().encode(message);
      const { frame } = await buildMessageFrame(payload, epochKey, false, 0);

      // Introduce 6 byte errors (beyond RS tolerance of 4 symbols)
      const corrupted = new Uint8Array(frame);
      for (let i = 0; i < 6; i++) {
        corrupted[i + 3] ^= 0xFF; // Corrupt 6 consecutive bytes
      }

      const corruptedBits = frameToBits(corrupted);
      const decoded = await tryDecodeMessage(corruptedBits, epochKey, 0);

      // Should fail gracefully (null, not throw)
      expect(decoded).toBeNull();
    });
  });
});
