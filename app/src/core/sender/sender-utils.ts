// Module: core/sender/sender-utils
// UI helper functions for post composition feedback (SPEC.md Section 7)

import { extractFeatures, type FeatureId } from '../protocol/features';
import type { PostFeaturesAnalysis, SignalProbabilityEstimate, ModificationSuggestion } from './types';

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
 * @param _text - Post text content (unused, reserved for future heuristics)
 * @param _hasMedia - Whether post has media (unused)
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
