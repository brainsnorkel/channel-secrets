// Module: core/receiver
// Facade that preserves the FeedMonitor API while delegating to decomposed modules

import { BlueskyAdapter } from '../../adapters/atproto';
import { RSSAdapter } from '../../adapters/rss';
import type { IPostAdapter, IFeedAdapter } from '../../adapters/interfaces';
import { fetchPosts as fetchPostsFn, type FeedAdapters } from './feed-fetcher';
import { detectSignalPosts as detectSignalPostsFn } from './signal-detector';
import { extractBits as extractBitsFn } from './bit-extractor';
import {
  tryDecodeMessage as tryDecodeMessageFn,
  processChannel as processChannelFn,
  deriveEpochKeysForGracePeriod,
} from './frame-decoder';
import { PollManager } from './poll-manager';
import type { UnifiedPost, ChannelConfig, Source, DecodedMessage } from './types';
import type { FeatureId } from '../protocol/features';

// Re-export all types
export type { UnifiedPost, ChannelConfig, Source, DecodedMessage } from './types';

// Re-export standalone function
export { deriveEpochKeysForGracePeriod } from './frame-decoder';

/**
 * Monitors feeds and extracts messages from signal posts.
 *
 * This class is a facade that delegates to the decomposed receiver modules
 * while preserving the original FeedMonitor public API.
 */
export class FeedMonitor {
  private adapters: FeedAdapters;
  private pollManager: PollManager;

  /**
   * Create a new feed monitor
   *
   * @param adapters - Platform adapters to use
   * @param pollInterval - Polling interval in milliseconds (default: 5 minutes)
   */
  constructor(
    adapters: {
      bluesky?: BlueskyAdapter | IPostAdapter;
      rss?: RSSAdapter | IFeedAdapter;
    },
    pollInterval: number = 5 * 60 * 1000
  ) {
    this.adapters = {
      bluesky: adapters.bluesky as IPostAdapter | undefined,
      rss: (adapters.rss ?? new RSSAdapter()) as IFeedAdapter,
    };
    this.pollManager = new PollManager(pollInterval);
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
    return fetchPostsFn(sources, this.adapters);
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
    return detectSignalPostsFn(posts, epochKey, rate);
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
    return extractBitsFn(signalPosts, featureSet, lengthThreshold);
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
    return tryDecodeMessageFn(bits, epochKey, messageSeqNum);
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
    return processChannelFn(channel, this.adapters, messageSeqNum);
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
    this.pollManager.startPolling(channelId, channel, this.adapters, onMessage);
  }

  /**
   * Stop polling for a channel
   *
   * @param channelId - Channel identifier
   */
  stopPolling(channelId: string): void {
    this.pollManager.stopPolling(channelId);
  }

  /**
   * Stop all polling
   */
  stopAllPolling(): void {
    this.pollManager.stopAllPolling();
  }
}
