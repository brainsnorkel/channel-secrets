// Module: core/receiver
// Message receiving pipeline for StegoChannel
// Implements message-receiving spec

import { BlueskyAdapter, type Post as BlueskyPost } from '../adapters/atproto';
import { RSSAdapter, type FeedItem } from '../adapters/rss';
import { isSignalPost } from './protocol/selection';
import { decodeFrame, bitsToFrame } from './protocol/framing';
import { extractFeatures, normalizeText, type FeatureId } from './protocol/features';
import {
  deriveEpochKeyForBeacon,
  type BeaconType,
  getEpochInfo,
  getBeaconHistory,
  getBeaconValue,
  formatDateBeacon,
} from './beacon';
import { sha256, stringToBytes, bytesToHex, deriveEpochKey } from './crypto';

// ============================================================================
// Types
// ============================================================================

/**
 * Unified post type for multi-source aggregation
 */
export interface UnifiedPost {
  /** Stable post identifier for selection hashing */
  id: string;
  /** Post text content */
  text: string;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Whether post has media attachments */
  hasMedia: boolean;
  /** Source platform (bluesky, rss) */
  source: 'bluesky' | 'rss';
  /** Original source identifier (handle, feed URL) */
  sourceId: string;
}

/**
 * Channel configuration for receiving
 */
export interface ChannelConfig {
  /** Shared channel key (32 bytes) */
  channelKey: Uint8Array;
  /** Beacon type for epoch synchronization */
  beaconType: BeaconType;
  /** Selection rate (0.0 to 1.0, default 0.25) */
  selectionRate: number;
  /** Feature set for bit extraction */
  featureSet: FeatureId[];
  /** Length threshold for 'len' feature */
  lengthThreshold: number;
  /** Sources to monitor (Bluesky handles, RSS feed URLs) */
  theirSources: Source[];
}

/**
 * Source to monitor for messages
 */
export interface Source {
  type: 'bluesky' | 'rss';
  /** Bluesky handle or RSS feed URL */
  identifier: string;
}

/**
 * Decoded message result
 */
export interface DecodedMessage {
  /** Message payload bytes */
  payload: Uint8Array;
  /** Protocol version */
  version: number;
  /** Whether message was encrypted */
  encrypted: boolean;
  /** Epoch key used for decoding */
  epochKey: Uint8Array;
  /** Number of bits accumulated */
  bitCount: number;
  /** Timestamp of decode */
  decodedAt: Date;
}

// ============================================================================
// Grace Period Helpers
// ============================================================================

/**
 * Derive epoch keys for current and previous epochs (grace period).
 * Date beacon: deterministically computes previous dates.
 * BTC/NIST: uses accumulated beacon history from epoch transitions.
 */
async function deriveEpochKeysForGracePeriod(
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

// ============================================================================
// FeedMonitor
// ============================================================================

/**
 * Monitors feeds and extracts messages from signal posts
 */
export class FeedMonitor {
  private blueskyAdapter?: BlueskyAdapter;
  private rssAdapter?: RSSAdapter;
  private pollIntervalMs: number;
  private pollTimers: Map<string, ReturnType<typeof setInterval>> = new Map();

  /**
   * Create a new feed monitor
   *
   * @param adapters - Platform adapters to use
   * @param pollInterval - Polling interval in milliseconds (default: 5 minutes)
   */
  constructor(
    adapters: {
      bluesky?: BlueskyAdapter;
      rss?: RSSAdapter;
    },
    pollInterval: number = 5 * 60 * 1000
  ) {
    this.blueskyAdapter = adapters.bluesky;
    this.rssAdapter = adapters.rss ?? new RSSAdapter();
    this.pollIntervalMs = pollInterval;
  }

  // ==========================================================================
  // Post Fetching
  // ==========================================================================

  /**
   * Fetch posts from all configured sources
   *
   * @param sources - Array of sources to fetch from
   * @returns Unified array of posts from all sources
   */
  async fetchPosts(sources: Source[]): Promise<UnifiedPost[]> {
    const allPosts: UnifiedPost[] = [];

    await Promise.all(
      sources.map(async (source) => {
        try {
          if (source.type === 'bluesky') {
            const posts = await this.fetchBlueskyPosts(source.identifier);
            allPosts.push(...posts);
          } else if (source.type === 'rss') {
            const posts = await this.fetchRSSPosts(source.identifier);
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
   */
  private async fetchBlueskyPosts(handle: string): Promise<UnifiedPost[]> {
    if (!this.blueskyAdapter) {
      throw new Error('Bluesky adapter not configured');
    }

    const response = await this.blueskyAdapter.getAuthorFeed(handle, { limit: 50 });

    return response.posts.map((post: BlueskyPost) => ({
      id: BlueskyAdapter.extractPostId(post.uri),
      text: post.text,
      timestamp: post.createdAt,
      hasMedia: post.hasMedia,
      source: 'bluesky' as const,
      sourceId: handle,
    }));
  }

  /**
   * Fetch posts from an RSS feed URL
   */
  private async fetchRSSPosts(feedUrl: string): Promise<UnifiedPost[]> {
    if (!this.rssAdapter) {
      throw new Error('RSS adapter not configured');
    }

    const result = await this.rssAdapter.fetchFeed(feedUrl);

    return result.items.map((item: FeedItem) => ({
      id: item.id,
      text: item.text,
      timestamp: item.pubDate.toISOString(),
      hasMedia: item.hasMedia,
      source: 'rss' as const,
      sourceId: feedUrl,
    }));
  }

  // ==========================================================================
  // Signal Post Detection
  // ==========================================================================

  /**
   * Filter signal posts from fetched posts
   *
   * @param posts - Array of posts to filter
   * @param epochKey - Epoch key for selection hashing
   * @param rate - Selection rate (default: 0.25)
   * @returns Array of signal posts
   */
  async detectSignalPosts(
    posts: UnifiedPost[],
    epochKey: Uint8Array,
    rate: number = 0.25
  ): Promise<UnifiedPost[]> {
    const signalPosts: UnifiedPost[] = [];

    await Promise.all(
      posts.map(async (post) => {
        const isSignal = await isSignalPost(epochKey, post.id, rate);
        if (isSignal) {
          signalPosts.push(post);
        }
      })
    );

    return signalPosts;
  }

  // ==========================================================================
  // Bit Extraction
  // ==========================================================================

  /**
   * Extract bits from signal posts with deduplication
   *
   * @param signalPosts - Array of signal posts
   * @param featureSet - Features to extract
   * @param lengthThreshold - Threshold for length feature
   * @returns Accumulated bit array
   */
  async extractBits(
    signalPosts: UnifiedPost[],
    featureSet: FeatureId[],
    lengthThreshold: number
  ): Promise<number[]> {
    // Sort by timestamp (chronological order)
    const sortedPosts = signalPosts.sort((a, b) => {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });

    // Deduplicate using deduplication key
    const seenKeys = new Set<string>();
    const bits: number[] = [];

    for (const post of sortedPosts) {
      // Extract features first
      const { bits: extractedBits } = extractFeatures(
        post.text,
        post.hasMedia,
        featureSet,
        lengthThreshold
      );

      // Compute deduplication key
      const dedupKey = await this.computeDeduplicationKey(
        post.text,
        extractedBits,
        post.timestamp
      );

      // Skip if duplicate
      if (seenKeys.has(dedupKey)) {
        continue;
      }

      // Record key and accumulate bits
      seenKeys.add(dedupKey);
      bits.push(...extractedBits);
    }

    return bits;
  }

  /**
   * Compute deduplication key for a signal post
   * Per spec: SHA256(normalized_text || extracted_bits || timestamp_bucket)
   *
   * @param text - Post text
   * @param extractedBits - Bits extracted from post
   * @param timestamp - ISO 8601 timestamp
   * @returns Hex string deduplication key
   */
  private async computeDeduplicationKey(
    text: string,
    extractedBits: number[],
    timestamp: string
  ): Promise<string> {
    // Normalize text
    const normalizedText = normalizeText(text);

    // Convert bits to string (e.g., "011")
    const bitsString = extractedBits.join('');

    // Compute timestamp bucket (1-hour buckets)
    const timestampMs = new Date(timestamp).getTime();
    const timestampBucket = Math.floor(timestampMs / (3600 * 1000));

    // Concatenate components
    const combined = normalizedText + bitsString + timestampBucket.toString();
    const combinedBytes = stringToBytes(combined);

    // Hash and convert to hex
    const hashBytes = await sha256(combinedBytes);
    return bytesToHex(hashBytes);
  }

  // ==========================================================================
  // Message Decoding
  // ==========================================================================

  /**
   * Attempt to decode a message from accumulated bits
   *
   * @param bits - Accumulated bit array
   * @param epochKey - Epoch key for authentication
   * @param messageSeqNum - Message sequence number (default: 0)
   * @returns Decoded message or null if incomplete/invalid
   */
  async tryDecodeMessage(
    bits: number[],
    epochKey: Uint8Array,
    messageSeqNum: number = 0
  ): Promise<DecodedMessage | null> {
    // Need at least enough bits for minimal frame
    // Minimum: 1 byte header + 2 bytes length + 8 bytes auth tag = 11 bytes = 88 bits
    if (bits.length < 88) {
      return null;
    }

    // Convert bits to frame bytes
    const frameBytes = bitsToFrame(bits);

    try {
      // Attempt to decode frame
      const decoded = await decodeFrame(frameBytes, epochKey, messageSeqNum);

      // Check if valid
      if (!decoded.valid) {
        return null;
      }

      return {
        payload: decoded.payload,
        version: decoded.version,
        encrypted: decoded.encrypted,
        epochKey,
        bitCount: bits.length,
        decodedAt: new Date(),
      };
    } catch (error) {
      // Frame decode failed (incomplete, invalid format, etc.)
      return null;
    }
  }

  // ==========================================================================
  // Channel Processing
  // ==========================================================================

  /**
   * Full receive pipeline for one channel
   *
   * @param channel - Channel configuration
   * @param messageSeqNum - Message sequence number (default: 0)
   * @returns Decoded message or null if none available
   */
  async processChannel(
    channel: ChannelConfig,
    messageSeqNum: number = 0
  ): Promise<DecodedMessage | null> {
    // Derive epoch keys for current and previous epochs (grace period)
    const epochKeys = await deriveEpochKeysForGracePeriod(
      channel.channelKey,
      channel.beaconType
    );

    // Fetch posts from all sources (once)
    const posts = await this.fetchPosts(channel.theirSources);

    // Track processed post IDs for deduplication across epochs
    const processedPostIds = new Set<string>();

    // Try each epoch in order (most recent first)
    for (const { epochKey, beaconValue } of epochKeys) {
      const result = await this.processEpoch(
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

  /**
   * Process posts for a single epoch
   */
  private async processEpoch(
    posts: UnifiedPost[],
    epochKey: Uint8Array,
    channel: ChannelConfig,
    messageSeqNum: number,
    processedPostIds?: Set<string>
  ): Promise<DecodedMessage | null> {
    // Detect signal posts
    const signalPosts = await this.detectSignalPosts(
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
    const bits = await this.extractBits(
      newSignalPosts,
      channel.featureSet,
      channel.lengthThreshold
    );

    // Try to decode message
    return this.tryDecodeMessage(bits, epochKey, messageSeqNum);
  }

  // ==========================================================================
  // Polling
  // ==========================================================================

  /**
   * Start automatic polling for a channel
   *
   * @param channelId - Unique channel identifier
   * @param channel - Channel configuration
   * @param onMessage - Callback when message is decoded
   */
  startPolling(
    channelId: string,
    channel: ChannelConfig,
    onMessage: (message: DecodedMessage) => void
  ): void {
    // Clear existing timer
    this.stopPolling(channelId);

    // Poll function
    const poll = async () => {
      try {
        const message = await this.processChannel(channel);
        if (message) {
          onMessage(message);
        }
      } catch (error) {
        console.error(`Polling error for channel ${channelId}:`, error);
      }
    };

    // Initial poll
    poll();

    // Set up interval
    const timer = setInterval(poll, this.pollIntervalMs);
    this.pollTimers.set(channelId, timer);
  }

  /**
   * Stop polling for a channel
   *
   * @param channelId - Channel identifier
   */
  stopPolling(channelId: string): void {
    const timer = this.pollTimers.get(channelId);
    if (timer) {
      clearInterval(timer);
      this.pollTimers.delete(channelId);
    }
  }

  /**
   * Stop all polling
   */
  stopAllPolling(): void {
    this.pollTimers.forEach((timer) => {
      clearInterval(timer);
    });
    this.pollTimers.clear();
  }
}
