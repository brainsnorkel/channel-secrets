// Module: core/receiver/frame-decoder
// Message frame decoding, grace period epoch iteration, and channel processing

import { decodeFrame, bitsToFrame } from '../protocol/framing';
import { deriveEpochKey } from '../crypto';
import {
  type BeaconType,
  getEpochInfo,
  getBeaconHistory,
  getBeaconValue,
  formatDateBeacon,
} from '../beacon';
import { detectSignalPosts } from './signal-detector';
import { extractBits } from './bit-extractor';
import { fetchPosts, type FeedAdapters } from './feed-fetcher';
import type { UnifiedPost, ChannelConfig, DecodedMessage } from './types';

/**
 * Derive epoch keys for current and previous epochs (grace period).
 * Date beacon: deterministically computes previous dates.
 * BTC/NIST: uses accumulated beacon history from epoch transitions.
 */
export async function deriveEpochKeysForGracePeriod(
  channelKey: Uint8Array,
  beaconType: BeaconType
): Promise<{ epochKey: Uint8Array; beaconValue: string }[]> {
  const epochInfo = getEpochInfo(beaconType);
  const results: { epochKey: Uint8Array; beaconValue: string }[] = [];

  if (beaconType === 'date') {
    const now = new Date();
    for (let i = 0; i <= epochInfo.epochsToCheck; i++) {
      const date = new Date(now);
      date.setUTCDate(date.getUTCDate() - i);
      const beaconValue = formatDateBeacon(date);
      const epochKey = await deriveEpochKey(channelKey, beaconType, beaconValue);
      results.push({ epochKey, beaconValue });
    }
  } else {
    const history = getBeaconHistory(beaconType);
    if (history.length === 0) {
      const beaconValue = await getBeaconValue(beaconType);
      const epochKey = await deriveEpochKey(channelKey, beaconType, beaconValue);
      results.push({ epochKey, beaconValue });
    } else {
      for (const beaconValue of history) {
        const epochKey = await deriveEpochKey(channelKey, beaconType, beaconValue);
        results.push({ epochKey, beaconValue });
      }
    }
  }

  return results;
}

/**
 * Attempt to decode a message from accumulated bits.
 *
 * @param bits - Accumulated bit array
 * @param epochKey - Epoch key for authentication
 * @param messageSeqNum - Message sequence number (default: 0)
 * @returns Decoded message or null if incomplete/invalid
 */
// SPEC Section 8.3: try seq through seq+MAX_SEQ_SKIP to recover from missed messages
const MAX_SEQ_SKIP = 5;

export async function tryDecodeMessage(
  bits: number[],
  epochKey: Uint8Array,
  messageSeqNum: number = 0
): Promise<(DecodedMessage & { usedSeqNum: number }) | null> {
  if (bits.length < 88) {
    return null;
  }

  const frameBytes = bitsToFrame(bits);

  for (let offset = 0; offset <= MAX_SEQ_SKIP; offset++) {
    const candidateSeq = messageSeqNum + offset;
    try {
      const decoded = await decodeFrame(frameBytes, epochKey, candidateSeq);

      if (decoded.valid) {
        return {
          payload: decoded.payload,
          version: decoded.version,
          encrypted: decoded.encrypted,
          epochKey,
          bitCount: bits.length,
          decodedAt: new Date(),
          usedSeqNum: candidateSeq,
        };
      }
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * Process posts for a single epoch.
 *
 * @param posts - All fetched posts
 * @param epochKey - Epoch key for this epoch
 * @param channel - Channel configuration
 * @param messageSeqNum - Message sequence number
 * @param processedPostIds - Set of already-processed post IDs (for cross-epoch dedup)
 * @returns Decoded message or null
 */
export async function processEpoch(
  posts: UnifiedPost[],
  epochKey: Uint8Array,
  channel: ChannelConfig,
  messageSeqNum: number,
  processedPostIds?: Set<string>
): Promise<DecodedMessage | null> {
  // Detect signal posts
  const signalPosts = await detectSignalPosts(
    posts,
    epochKey,
    channel.selectionRate
  );

  // Filter out already-processed posts (for grace period deduplication)
  const newSignalPosts = processedPostIds
    ? signalPosts.filter((post) => {
        if (processedPostIds.has(post.id)) {
          return false;
        }
        processedPostIds.add(post.id);
        return true;
      })
    : signalPosts;

  // Extract bits with deduplication
  const bits = await extractBits(
    newSignalPosts,
    channel.featureSet,
    channel.lengthThreshold
  );

  // Try to decode message
  return tryDecodeMessage(bits, epochKey, messageSeqNum);
}

/**
 * Full receive pipeline for one channel.
 *
 * @param channel - Channel configuration
 * @param adapters - Platform adapters for fetching
 * @param messageSeqNum - Message sequence number (default: 0)
 * @returns Decoded message or null if none available
 */
export async function processChannel(
  channel: ChannelConfig,
  adapters: FeedAdapters,
  messageSeqNum: number = 0
): Promise<DecodedMessage | null> {
  // Derive epoch keys for current and previous epochs (grace period)
  const epochKeys = await deriveEpochKeysForGracePeriod(
    channel.channelKey,
    channel.beaconType
  );

  // Fetch posts from all sources (once)
  const posts = await fetchPosts(channel.theirSources, adapters);

  // Track processed post IDs for deduplication across epochs
  const processedPostIds = new Set<string>();

  // Try each epoch in order (most recent first)
  for (const { epochKey } of epochKeys) {
    const result = await processEpoch(
      posts,
      epochKey,
      channel,
      messageSeqNum,
      processedPostIds
    );

    if (result) {
      return result;
    }
  }

  return null;
}
