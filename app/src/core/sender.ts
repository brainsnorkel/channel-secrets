// Module: core/sender
// Message transmission pipeline for StegoChannel (SPEC.md Section 9)

import { computeSelectionHash, getSelectionValue, computeThreshold } from './protocol/selection';
import { extractFeatures, type FeatureId } from './protocol/features';
import { encodeFrame, frameToBits } from './protocol/framing';
import { deriveEpochKeyForBeacon, getBeaconValue, type BeaconType } from './beacon';
import type { StorageInterface } from '../storage';
import { BlueskyAdapter } from '../adapters/atproto';

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
interface CurrentTransmission {
  messageId: string;
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
interface PostFeatures {
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
  epochInfo?: {
    epochId: string;
    expiresAt: number;
    timeRemaining: number;
  };
}

/**
 * Channel configuration needed for transmission
 */
interface ChannelConfig {
  id: string;
  key: Uint8Array;
  beaconType: BeaconType;
  selectionRate?: number;
  featureSet?: FeatureId[];
}

/**
 * Message transmitter for StegoChannel protocol
 * Implements sender pipeline from SPEC.md Section 9
 */
export class MessageTransmitter {
  private storage: StorageInterface;
  private channels: Map<string, ChannelConfig> = new Map();
  private states: Map<string, TransmissionState> = new Map();

  constructor(storage: StorageInterface) {
    this.storage = storage;
  }

  /**
   * Register a channel for transmission
   */
  registerChannel(config: ChannelConfig): void {
    this.channels.set(config.id, {
      ...config,
      selectionRate: config.selectionRate ?? 0.25,
      featureSet: config.featureSet ?? ['len', 'media', 'qmark'],
    });
  }

  /**
   * Queue a message for transmission
   * Per SPEC Section 9.1
   */
  async queueMessage(
    channelId: string,
    message: string,
    priority: 'normal' | 'high' = 'normal'
  ): Promise<string> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error(`Channel ${channelId} not registered`);
    }

    // Load or initialize state
    let state = this.states.get(channelId);
    if (!state) {
      state = await this.loadState(channelId);
      this.states.set(channelId, state);
    }

    // Create queued message
    const messageId = crypto.randomUUID();
    const queuedMessage: QueuedMessage = {
      id: messageId,
      plaintext: message,
      queuedAt: Date.now(),
      priority,
    };

    // Add to queue (high priority goes to front)
    if (priority === 'high') {
      state.messageQueue.unshift(queuedMessage);
    } else {
      state.messageQueue.push(queuedMessage);
    }

    // Persist state
    await this.persistState(state);

    // Start transmission if none active
    if (!state.currentTransmission) {
      await this.startNextTransmission(channelId);
    }

    return messageId;
  }

  /**
   * Check what bits a draft post would encode
   * Cannot predict signal vs cover - that requires actual post ID from Bluesky
   * Per SPEC Section 9.1
   */
  async checkPost(
    channelId: string,
    text: string,
    hasMedia: boolean
  ): Promise<PostCheckResult> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error(`Channel ${channelId} not registered`);
    }

    let state = this.states.get(channelId);
    if (!state) {
      state = await this.loadState(channelId);
      this.states.set(channelId, state);
    }

    // Extract post features
    const featureResult = extractFeatures(text, hasMedia, channel.featureSet!);
    const features: PostFeatures = {
      len: featureResult.bits[0] as 0 | 1,
      media: featureResult.bits[1] as 0 | 1,
      qmark: featureResult.bits[2] as 0 | 1,
    };
    const extractedBits = featureResult.bits;

    // Not transmitting anything
    if (!state.currentTransmission) {
      return {
        features,
        extractedBits,
        requiredBits: null,
        wouldMatch: false,
        guidance: 'No active transmission. Post will be cover traffic.',
      };
    }

    // Transmitting: show what bits are needed
    const transmission = state.currentTransmission;
    const bitsNeeded = transmission.totalBits - transmission.bitPosition;

    if (bitsNeeded === 0) {
      return {
        features,
        extractedBits,
        requiredBits: null,
        wouldMatch: false,
        guidance: 'Transmission complete. Post will be cover traffic.',
      };
    }

    // Get required bits for next transmission
    const bitsToExtract = Math.min(extractedBits.length, bitsNeeded);
    const requiredBits = transmission.pendingBits.slice(0, bitsToExtract);

    // Check if bits would match IF this becomes a signal post
    const actualBits = extractedBits.slice(0, bitsToExtract);
    const wouldMatch = actualBits.every((bit, i) => bit === requiredBits[i]);

    if (wouldMatch) {
      return {
        features,
        extractedBits,
        requiredBits,
        wouldMatch: true,
        guidance: `IF this becomes a signal post, it would carry ${bitsToExtract} required bit(s). Publish to find out!`,
      };
    } else {
      return {
        features,
        extractedBits,
        requiredBits,
        wouldMatch: false,
        guidance: `IF signal: bits wouldn't match (need ${requiredBits.join('')}, have ${actualBits.join('')}). Consider different wording or just post anyway.`,
      };
    }
  }

  /**
   * Confirm that a post was published
   * Uses actual Bluesky rkey to determine if signal and advance transmission
   * Per SPEC Section 9.1
   */
  async confirmPost(
    channelId: string,
    postUri: string,
    text: string,
    hasMedia: boolean
  ): Promise<ConfirmPostResult> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error(`Channel ${channelId} not registered`);
    }

    let state = this.states.get(channelId);
    if (!state) {
      state = await this.loadState(channelId);
      this.states.set(channelId, state);
    }

    if (!state.currentTransmission) {
      return {
        wasSignal: false,
        bitsMatched: false,
        transmissionAdvanced: false,
        newBitPosition: 0,
        totalBits: 0,
        message: 'No active transmission. Post was cover traffic.',
      };
    }

    const transmission = state.currentTransmission;

    // Extract actual post ID (rkey) from AT URI
    const postId = BlueskyAdapter.extractPostId(postUri);

    // Get epoch key
    const { epochKey } = await this.getEpochKey(channel, state);

    // Determine if this was actually a signal post using real rkey
    const threshold = computeThreshold(channel.selectionRate!);
    const selectionHash = await computeSelectionHash(epochKey, postId);
    const selectionValue = getSelectionValue(selectionHash);
    const wasSignal = selectionValue < threshold;

    if (!wasSignal) {
      return {
        wasSignal: false,
        bitsMatched: false,
        transmissionAdvanced: false,
        newBitPosition: transmission.bitPosition,
        totalBits: transmission.totalBits,
        message: 'Cover post. Transmission continues.',
      };
    }

    // Signal post - extract features and check if bits match
    const featureResult = extractFeatures(text, hasMedia, channel.featureSet!);
    const extractedBits = featureResult.bits;

    const bitsNeeded = transmission.totalBits - transmission.bitPosition;
    const bitsToExtract = Math.min(extractedBits.length, bitsNeeded);
    const requiredBits = transmission.pendingBits.slice(0, bitsToExtract);
    const actualBits = extractedBits.slice(0, bitsToExtract);

    const bitsMatched = actualBits.every((bit, i) => bit === requiredBits[i]);

    if (bitsMatched) {
      // Advance transmission
      transmission.bitPosition += bitsToExtract;
      transmission.pendingBits = transmission.pendingBits.slice(bitsToExtract);
      transmission.signalPostsUsed.push(postUri);
      transmission.lastActivityAt = Date.now();

      const newBitPosition = transmission.bitPosition;
      const totalBits = transmission.totalBits;

      // Check if transmission complete
      if (transmission.bitPosition >= transmission.totalBits) {
        await this.completeTransmission(channelId);
        return {
          wasSignal: true,
          bitsMatched: true,
          transmissionAdvanced: true,
          newBitPosition,
          totalBits,
          message: `Signal post! Transmitted ${bitsToExtract} bits. Message complete!`,
        };
      } else {
        await this.persistState(state);
        return {
          wasSignal: true,
          bitsMatched: true,
          transmissionAdvanced: true,
          newBitPosition,
          totalBits,
          message: `Signal post! Transmitted ${bitsToExtract} bits. Progress: ${newBitPosition}/${totalBits}`,
        };
      }
    } else {
      // Signal post but bits didn't match - no progress
      return {
        wasSignal: true,
        bitsMatched: false,
        transmissionAdvanced: false,
        newBitPosition: transmission.bitPosition,
        totalBits: transmission.totalBits,
        message: `Signal post, but bits didn't match (needed ${requiredBits.join('')}, got ${actualBits.join('')}). No progress.`,
      };
    }
  }

  /**
   * Get transmission status for a channel
   */
  async getStatus(channelId: string): Promise<TransmissionStatus> {
    let state = this.states.get(channelId);
    if (!state) {
      state = await this.loadState(channelId);
      this.states.set(channelId, state);
    }

    if (!state.currentTransmission) {
      return {
        active: false,
        queueLength: state.messageQueue.length,
      };
    }

    const transmission = state.currentTransmission;
    const progress = {
      bitsSent: transmission.bitPosition,
      totalBits: transmission.totalBits,
      percentage: (transmission.bitPosition / transmission.totalBits) * 100,
    };

    return {
      active: true,
      messageId: transmission.messageId,
      progress,
      queueLength: state.messageQueue.length,
      epochInfo: {
        epochId: transmission.epochId,
        expiresAt: transmission.epochExpiresAt,
        timeRemaining: Math.max(0, transmission.epochExpiresAt - Date.now()),
      },
    };
  }

  /**
   * Cancel current transmission
   */
  async cancelTransmission(channelId: string): Promise<void> {
    const state = this.states.get(channelId);
    if (!state?.currentTransmission) {
      return;
    }

    // Move current message back to front of queue
    const transmission = state.currentTransmission;
    const message = state.messageQueue.find(m => m.id === transmission.messageId);
    if (message) {
      state.messageQueue.unshift(message);
    }

    state.currentTransmission = null;
    await this.persistState(state);
  }

  /**
   * Start transmission of next queued message
   */
  private async startNextTransmission(channelId: string): Promise<void> {
    const state = this.states.get(channelId);
    if (!state || state.messageQueue.length === 0) {
      return;
    }

    const channel = this.channels.get(channelId);
    if (!channel) return;

    // Dequeue next message
    const message = state.messageQueue.shift()!;

    // Encode message frame
    const { epochKey, epochId, epochExpiresAt } = await this.getEpochKey(channel, state);
    const payloadBytes = new TextEncoder().encode(message.plaintext);
    const frame = await encodeFrame(payloadBytes, epochKey, false, state.messageSequenceNumber);
    const frameBits = frameToBits(frame);

    // Initialize transmission
    state.currentTransmission = {
      messageId: message.id,
      encodedFrame: frame,
      totalBits: frameBits.length,
      bitPosition: 0,
      pendingBits: frameBits,
      epochKey,
      epochId,
      epochExpiresAt,
      signalPostsUsed: [],
      startedAt: Date.now(),
      lastActivityAt: Date.now(),
    };

    state.messageSequenceNumber++;
    await this.persistState(state);
  }

  /**
   * Complete current transmission
   */
  private async completeTransmission(channelId: string): Promise<void> {
    const state = this.states.get(channelId);
    if (!state?.currentTransmission) {
      return;
    }

    // Clear current transmission
    state.currentTransmission = null;
    await this.persistState(state);

    // Start next transmission if queue not empty
    if (state.messageQueue.length > 0) {
      await this.startNextTransmission(channelId);
    }
  }

  /**
   * Get or derive epoch key for current beacon
   * Handles epoch transitions
   */
  private async getEpochKey(
    channel: ChannelConfig,
    state: TransmissionState
  ): Promise<{ epochKey: Uint8Array; epochId: string; epochExpiresAt: number }> {
    const now = Date.now();

    // Check if current epoch is still valid
    if (state.currentTransmission) {
      const transmission = state.currentTransmission;
      if (now < transmission.epochExpiresAt) {
        return {
          epochKey: transmission.epochKey,
          epochId: transmission.epochId,
          epochExpiresAt: transmission.epochExpiresAt,
        };
      }
    }

    // Derive new epoch key
    const beaconValue = await getBeaconValue(channel.beaconType);
    const epochKey = await deriveEpochKeyForBeacon(channel.key, channel.beaconType);
    const epochId = `${channel.beaconType}:${beaconValue}`;

    // Calculate epoch expiration
    const epochDuration = this.getEpochDuration(channel.beaconType);
    const epochExpiresAt = now + epochDuration;

    return { epochKey, epochId, epochExpiresAt };
  }

  /**
   * Get epoch duration in milliseconds
   */
  private getEpochDuration(beaconType: BeaconType): number {
    switch (beaconType) {
      case 'btc':
        return 600_000; // 10 minutes
      case 'nist':
        return 60_000; // 1 minute
      case 'date':
        return 86400_000; // 24 hours
    }
  }


  /**
   * Load transmission state from storage
   */
  private async loadState(channelId: string): Promise<TransmissionState> {
    const stored = await this.storage.getState<TransmissionState>(`transmission:${channelId}`);
    if (stored) {
      return stored;
    }

    // Initialize new state
    return {
      channelId,
      messageQueue: [],
      currentTransmission: null,
      messageSequenceNumber: 0,
    };
  }

  /**
   * Persist transmission state to storage
   */
  private async persistState(state: TransmissionState): Promise<void> {
    await this.storage.saveState(`transmission:${state.channelId}`, state);
  }
}

// ============================================================================
// POST ANALYSIS HELPERS (T2)
// UI-focused utilities for real-time post composition feedback
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

/**
 * Analyze post features without needing channel context.
 * Useful for UI to show real-time feature extraction as user types.
 *
 * @param text - Post text content
 * @param hasMedia - Whether post has media (images, links)
 * @returns Feature bits and extracted bit values
 */
export function analyzePostFeatures(text: string, hasMedia: boolean): PostFeaturesAnalysis {
  const featureSet: FeatureId[] = ['len', 'media', 'qmark'];
  const result = extractFeatures(text, hasMedia, featureSet);

  return {
    len: result.bits[0] as 0 | 1,
    media: result.bits[1] as 0 | 1,
    qmark: result.bits[2] as 0 | 1,
    extractedBits: result.bits,
  };
}

/**
 * Estimate the probability of a post being selected as a signal post.
 * Based on the configured selection rate (default 25%).
 *
 * Note: This is an estimate. Actual selection depends on the epoch key
 * and post ID hash, which can only be computed when the post is ready.
 *
 * @param text - Post text content (unused in current implementation, reserved for future heuristics)
 * @param hasMedia - Whether post has media (unused in current implementation)
 * @param selectionRate - Channel selection rate (default 0.25 = 25%)
 * @returns Probability estimate and likelihood flag
 */
export function estimateSignalProbability(
  _text: string,
  _hasMedia: boolean,
  selectionRate: number = 0.25
): SignalProbabilityEstimate {
  // Selection is deterministic based on hash, so the probability
  // is exactly the selection rate
  const probability = selectionRate;
  const isLikely = probability >= 0.25;

  return {
    probability,
    isLikely,
  };
}

/**
 * Suggest modifications to achieve target bit values.
 * Helps users craft posts that will encode the required bits.
 *
 * @param currentBits - Currently extracted bits [len, media, qmark]
 * @param targetBits - Target bits needed for transmission
 * @returns Array of actionable suggestions
 */
export function suggestModifications(
  currentBits: number[],
  targetBits: number[]
): ModificationSuggestion[] {
  const suggestions: ModificationSuggestion[] = [];
  const featureNames = ['len', 'media', 'qmark'];
  const featureDescriptions = [
    'post length',
    'media presence',
    'question mark',
  ];

  for (let i = 0; i < Math.min(currentBits.length, targetBits.length); i++) {
    const current = currentBits[i];
    const target = targetBits[i];

    if (current !== target) {
      let suggestion: string;

      switch (featureNames[i]) {
        case 'len':
          if (target === 1) {
            suggestion = 'Make your post longer (above median length, typically 50+ characters)';
          } else {
            suggestion = 'Make your post shorter (below median length, typically under 50 characters)';
          }
          break;

        case 'media':
          if (target === 1) {
            suggestion = 'Add an image, link, or other media to your post';
          } else {
            suggestion = 'Remove media from your post (text-only)';
          }
          break;

        case 'qmark':
          if (target === 1) {
            suggestion = 'Add a question mark (?) to your post';
          } else {
            suggestion = 'Remove question marks from your post';
          }
          break;

        default:
          suggestion = `Change ${featureDescriptions[i]} from ${current} to ${target}`;
      }

      suggestions.push({
        feature: featureNames[i],
        currentValue: current,
        targetValue: target,
        suggestion,
      });
    }
  }

  return suggestions;
}

/**
 * Get the next N bits required for active transmission on a channel.
 * Returns null if no active transmission exists.
 *
 * This is a helper that transmitter instances can expose to the UI.
 * Since it needs access to transmission state, it should be called
 * via the MessageTransmitter instance method (see below).
 *
 * @param transmitter - MessageTransmitter instance
 * @param channelId - Channel identifier
 * @param maxBits - Maximum number of bits to return (default 3, matches feature count)
 * @returns Array of required bits, or null if no active transmission
 */
export async function getNextRequiredBits(
  transmitter: MessageTransmitter,
  channelId: string,
  maxBits: number = 3
): Promise<number[] | null> {
  const status = await transmitter.getStatus(channelId);

  if (!status.active) {
    return null;
  }

  // Access the internal state to get pending bits
  // Note: This requires the state to be accessible
  const state = (transmitter as any).states.get(channelId);
  if (!state?.currentTransmission) {
    return null;
  }

  const transmission = state.currentTransmission;
  return transmission.pendingBits.slice(0, maxBits);
}
