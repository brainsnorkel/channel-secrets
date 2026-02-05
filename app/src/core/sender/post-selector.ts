// Module: core/sender/post-selector
// Post checking and confirmation logic for StegoChannel (SPEC.md Section 9.1)

import { computeSelectionHash, getSelectionValue, computeThreshold } from '../protocol/selection';
import { extractFeatures } from '../protocol/features';
import type { ChannelConfig, TransmissionState, PostFeatures, PostCheckResult, ConfirmPostResult } from './types';

/**
 * Check what bits a draft post would encode.
 * Cannot predict signal vs cover - that requires actual post ID from the platform.
 *
 * @param text - Draft post text
 * @param hasMedia - Whether post has media
 * @param state - Current transmission state
 * @param channelConfig - Channel configuration
 * @returns Post check result with feature analysis and bit matching info
 */
export function checkPost(
  text: string,
  hasMedia: boolean,
  state: TransmissionState,
  channelConfig: ChannelConfig
): PostCheckResult {
  // Extract post features
  const featureResult = extractFeatures(text, hasMedia, channelConfig.featureSet!);
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
 * Confirm that a post was published and determine if it advances transmission.
 * Uses actual platform post ID to determine signal vs cover.
 *
 * @param postUri - Platform URI of the published post
 * @param text - Post text content
 * @param hasMedia - Whether post has media
 * @param state - Current transmission state (mutated on success)
 * @param channelConfig - Channel configuration
 * @param epochKey - Current epoch key
 * @param extractPostId - Function to extract post ID from URI (injected dependency)
 * @returns Confirm result with signal determination and bit advancement info
 */
export async function confirmPost(
  postUri: string,
  text: string,
  hasMedia: boolean,
  state: TransmissionState,
  channelConfig: ChannelConfig,
  epochKey: Uint8Array,
  extractPostId: (uri: string) => string
): Promise<{ result: ConfirmPostResult; transmissionComplete: boolean }> {
  if (!state.currentTransmission) {
    return {
      result: {
        wasSignal: false,
        bitsMatched: false,
        transmissionAdvanced: false,
        newBitPosition: 0,
        totalBits: 0,
        message: 'No active transmission. Post was cover traffic.',
      },
      transmissionComplete: false,
    };
  }

  const transmission = state.currentTransmission;

  // Extract actual post ID (rkey) from platform URI
  const postId = extractPostId(postUri);

  // Determine if this was actually a signal post using real post ID
  const threshold = computeThreshold(channelConfig.selectionRate!);
  const selectionHash = await computeSelectionHash(epochKey, postId);
  const selectionValue = getSelectionValue(selectionHash);
  const wasSignal = selectionValue < threshold;

  if (!wasSignal) {
    return {
      result: {
        wasSignal: false,
        bitsMatched: false,
        transmissionAdvanced: false,
        newBitPosition: transmission.bitPosition,
        totalBits: transmission.totalBits,
        message: 'Cover post. Transmission continues.',
      },
      transmissionComplete: false,
    };
  }

  // Signal post - extract features and check if bits match
  const featureResult = extractFeatures(text, hasMedia, channelConfig.featureSet!);
  const extractedBits = featureResult.bits;

  const bitsNeeded = transmission.totalBits - transmission.bitPosition;
  const bitsToExtract = Math.min(extractedBits.length, bitsNeeded);
  const requiredBits = transmission.pendingBits.slice(0, bitsToExtract);
  const actualBits = extractedBits.slice(0, bitsToExtract);

  const bitsMatched = actualBits.every((bit, i) => bit === requiredBits[i]);

  if (bitsMatched) {
    // Advance transmission (mutate state)
    transmission.bitPosition += bitsToExtract;
    transmission.pendingBits = transmission.pendingBits.slice(bitsToExtract);
    transmission.signalPostsUsed.push(postUri);
    transmission.lastActivityAt = Date.now();

    const newBitPosition = transmission.bitPosition;
    const totalBits = transmission.totalBits;
    const transmissionComplete = transmission.bitPosition >= transmission.totalBits;

    return {
      result: {
        wasSignal: true,
        bitsMatched: true,
        transmissionAdvanced: true,
        newBitPosition,
        totalBits,
        message: transmissionComplete
          ? `Signal post! Transmitted ${bitsToExtract} bits. Message complete!`
          : `Signal post! Transmitted ${bitsToExtract} bits. Progress: ${newBitPosition}/${totalBits}`,
      },
      transmissionComplete,
    };
  } else {
    // Signal post but bits didn't match - no progress
    return {
      result: {
        wasSignal: true,
        bitsMatched: false,
        transmissionAdvanced: false,
        newBitPosition: transmission.bitPosition,
        totalBits: transmission.totalBits,
        message: `Signal post, but bits didn't match (needed ${requiredBits.join('')}, got ${actualBits.join('')}). No progress.`,
      },
      transmissionComplete: false,
    };
  }
}
