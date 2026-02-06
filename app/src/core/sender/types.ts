// Module: core/sender/types
// Type definitions for StegoChannel sender pipeline (SPEC.md Section 9)

import type { BeaconType } from '../beacon';
import type { FeatureId } from '../protocol/features';

/**
 * Queued message waiting for transmission
 */
export interface QueuedMessage {
  id: string;
  plaintext: string;
  queuedAt: number;
  priority: 'normal' | 'high';
}

/**
 * Current transmission in progress
 */
export interface CurrentTransmission {
  messageId: string;
  plaintext: string;
  encodedFrame: Uint8Array;
  totalBits: number;
  bitPosition: number;
  pendingBits: number[];
  epochKey: Uint8Array;
  epochId: string;
  epochExpiresAt: number;
  signalPostsUsed: string[];
  startedAt: number;
  lastActivityAt: number;
}

/**
 * Transmission state for a channel
 */
export interface TransmissionState {
  channelId: string;
  messageQueue: QueuedMessage[];
  currentTransmission: CurrentTransmission | null;
  messageSequenceNumber: number;
}

/**
 * Post feature extraction result
 */
export interface PostFeatures {
  len: 0 | 1;
  media: 0 | 1;
  qmark: 0 | 1;
}

/**
 * Result of post check operation
 * Shows what bits a draft would encode IF it becomes a signal post
 */
export interface PostCheckResult {
  features: PostFeatures;
  extractedBits: number[];
  requiredBits: number[] | null;
  wouldMatch: boolean;
  guidance: string;
}

/**
 * Result of post confirmation after publishing
 */
export interface ConfirmPostResult {
  wasSignal: boolean;
  bitsMatched: boolean;
  transmissionAdvanced: boolean;
  newBitPosition: number;
  totalBits: number;
  message: string;
}

/**
 * Transmission status information
 */
export interface TransmissionStatus {
  active: boolean;
  messageId?: string;
  progress?: {
    bitsSent: number;
    totalBits: number;
    percentage: number;
  };
  queueLength: number;
  beaconType?: BeaconType;
  epochInfo?: {
    epochId: string;
    expiresAt: number;
    timeRemaining: number;
  };
}

/**
 * Channel configuration needed for transmission
 */
export interface ChannelConfig {
  id: string;
  key: Uint8Array;
  beaconType: BeaconType;
  selectionRate?: number;
  featureSet?: FeatureId[];
}

// ============================================================================
// UI helper types
// ============================================================================

/**
 * Result of post feature analysis
 */
export interface PostFeaturesAnalysis {
  len: 0 | 1;
  media: 0 | 1;
  qmark: 0 | 1;
  extractedBits: number[];
}

/**
 * Signal probability estimation result
 */
export interface SignalProbabilityEstimate {
  probability: number;
  isLikely: boolean;
}

/**
 * Modification suggestion for matching target bits
 */
export interface ModificationSuggestion {
  feature: string;
  currentValue: number;
  targetValue: number;
  suggestion: string;
}
