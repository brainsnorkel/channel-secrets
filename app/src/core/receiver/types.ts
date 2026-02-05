// Module: core/receiver/types
// Shared type definitions for the receiver pipeline

import type { BeaconType } from '../beacon';
import type { FeatureId } from '../protocol/features';

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
