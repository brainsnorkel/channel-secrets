// Module: ui/hooks/useChannelOperations
// Wraps core channel operations with activity logging

import { useCallback, useRef } from 'react';
import { useActivityLog } from '../components/ActivityLog';
import { FeedMonitor, type UnifiedPost, type ChannelConfig, type DecodedMessage } from '../../core/receiver';
import { deriveEpochKeyForBeacon, type BeaconType } from '../../core/beacon';
import { extractFeatures, type FeatureId } from '../../core/protocol/features';
import { bytesToHex } from '../../core/crypto';

/**
 * Hook that wraps channel operations with activity logging.
 * Provides production-friendly messages and detailed debug information.
 */
export function useChannelOperations() {
  const { info, detail, debug } = useActivityLog();
  const monitorRef = useRef<FeedMonitor | null>(null);

  /**
   * Get or create the feed monitor instance
   */
  const getMonitor = useCallback(() => {
    if (!monitorRef.current) {
      monitorRef.current = new FeedMonitor({});
    }
    return monitorRef.current;
  }, []);

  /**
   * Fetch posts from sources with logging
   */
  const fetchPosts = useCallback(async (
    sources: ChannelConfig['theirSources']
  ): Promise<UnifiedPost[]> => {
    const monitor = getMonitor();

    info('fetch', 'Checking for new content...', `Fetching posts from ${sources.length} source(s)`);

    const startTime = Date.now();

    try {
      const posts = await monitor.fetchPosts(sources);
      const elapsed = Date.now() - startTime;

      detail('fetch', `Found ${posts.length} items`, `Fetched ${posts.length} posts in ${elapsed}ms`);

      debug('fetch', 'Content sources synced', `Sources: ${sources.map(s => `${s.type}:${s.identifier}`).join(', ')}`);

      return posts;
    } catch (error) {
      info('error', 'Unable to refresh content', `Fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }, [getMonitor, info, detail, debug]);

  /**
   * Derive epoch key with logging
   */
  const deriveEpochKey = useCallback(async (
    channelKey: Uint8Array,
    beaconType: BeaconType
  ): Promise<Uint8Array> => {
    info('epoch', 'Synchronizing...', `Deriving epoch key using ${beaconType} beacon`);

    try {
      const epochKey = await deriveEpochKeyForBeacon(channelKey, beaconType);

      debug('epoch', 'Sync complete', `Epoch key derived: ${bytesToHex(epochKey).slice(0, 16)}...`);

      return epochKey;
    } catch (error) {
      info('error', 'Sync error - will retry', `Epoch derivation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }, [info, debug]);

  /**
   * Detect signal posts with logging
   */
  const detectSignalPosts = useCallback(async (
    posts: UnifiedPost[],
    epochKey: Uint8Array,
    rate: number = 0.25
  ): Promise<UnifiedPost[]> => {
    const monitor = getMonitor();

    detail('signal', 'Analyzing content...', `Checking ${posts.length} posts for signal selection (rate=${rate})`);

    const signalPosts = await monitor.detectSignalPosts(posts, epochKey, rate);

    if (signalPosts.length > 0) {
      info('signal', `Processing ${signalPosts.length} item(s)`, `Detected ${signalPosts.length} signal posts out of ${posts.length} total`);

      debug('signal', 'Content analysis complete', `Signal post IDs: ${signalPosts.map(p => p.id.slice(0, 8)).join(', ')}`);
    } else {
      detail('signal', 'No new items to process', `0 signal posts detected in ${posts.length} posts`);
    }

    return signalPosts;
  }, [getMonitor, info, detail, debug]);

  /**
   * Extract features from a post with logging
   */
  const extractPostFeatures = useCallback((
    text: string,
    hasMedia: boolean,
    featureSet: FeatureId[],
    lengthThreshold: number
  ) => {
    const result = extractFeatures(text, hasMedia, featureSet, lengthThreshold);

    debug('encode', 'Content analyzed', `Features: len=${text.length}>${lengthThreshold}? media=${hasMedia} → bits=${result.bits.join('')} (0b${parseInt(result.bits.join(''), 2).toString(2).padStart(3, '0')})`);

    return result;
  }, [debug]);

  /**
   * Extract bits from signal posts with logging
   */
  const extractBits = useCallback(async (
    signalPosts: UnifiedPost[],
    featureSet: FeatureId[],
    lengthThreshold: number
  ): Promise<number[]> => {
    const monitor = getMonitor();

    detail('decode', 'Processing content...', `Extracting bits from ${signalPosts.length} signal posts`);

    const bits = await monitor.extractBits(signalPosts, featureSet, lengthThreshold);

    if (bits.length > 0) {
      info('decode', 'Data accumulated', `Extracted ${bits.length} bits from ${signalPosts.length} posts`);

      debug('decode', 'Bit extraction complete', `Bits: ${bits.slice(0, 24).join('')}${bits.length > 24 ? '...' : ''} (${bits.length} total)`);
    }

    return bits;
  }, [getMonitor, info, detail, debug]);

  /**
   * Try to decode a message with logging
   */
  const tryDecodeMessage = useCallback(async (
    bits: number[],
    epochKey: Uint8Array,
    messageSeqNum: number = 0
  ): Promise<DecodedMessage | null> => {
    const monitor = getMonitor();

    if (bits.length < 88) {
      detail('decode', 'Waiting for more data...', `Need ${88 - bits.length} more bits (have ${bits.length}/88 minimum)`);
      return null;
    }

    detail('decode', 'Checking for complete message...', `Attempting frame decode with ${bits.length} bits`);

    const message = await monitor.tryDecodeMessage(bits, epochKey, messageSeqNum);

    if (message) {
      info('decode', 'New note received!', `Message decoded: ${message.payload.length} bytes, version=${message.version}, encrypted=${message.encrypted}`);

      debug('decode', 'Message details available', `HMAC verified, ${message.bitCount} bits consumed, decoded at ${message.decodedAt.toISOString()}`);
    } else {
      debug('decode', 'No complete message yet', 'Frame decode returned null (incomplete or invalid)');
    }

    return message;
  }, [getMonitor, info, detail, debug]);

  /**
   * Process a full channel receive cycle with logging
   */
  const processChannel = useCallback(async (
    channel: ChannelConfig,
    messageSeqNum: number = 0
  ): Promise<DecodedMessage | null> => {
    info('fetch', 'Refreshing feed...', `Processing channel with ${channel.theirSources.length} sources`);

    try {
      // Derive epoch key
      const epochKey = await deriveEpochKey(channel.channelKey, channel.beaconType);

      // Fetch posts
      const posts = await fetchPosts(channel.theirSources);

      // Detect signal posts
      const signalPosts = await detectSignalPosts(posts, epochKey, channel.selectionRate);

      if (signalPosts.length === 0) {
        detail('signal', 'Feed up to date', 'No signal posts detected this cycle');
        return null;
      }

      // Extract bits
      const bits = await extractBits(signalPosts, channel.featureSet, channel.lengthThreshold);

      // Try to decode
      return await tryDecodeMessage(bits, epochKey, messageSeqNum);
    } catch (error) {
      info('error', 'Refresh failed - will retry', `Channel processing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }, [info, detail, deriveEpochKey, fetchPosts, detectSignalPosts, extractBits, tryDecodeMessage]);

  return {
    fetchPosts,
    deriveEpochKey,
    detectSignalPosts,
    extractPostFeatures,
    extractBits,
    tryDecodeMessage,
    processChannel,
  };
}
