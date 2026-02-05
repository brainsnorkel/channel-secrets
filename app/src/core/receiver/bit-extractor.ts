// Module: core/receiver/bit-extractor
// Bit extraction from signal posts with deduplication

import { extractFeatures, normalizeText, type FeatureId } from '../protocol/features';
import { sha256, stringToBytes, bytesToHex } from '../crypto';
import type { UnifiedPost } from './types';

/**
 * Extract bits from signal posts with deduplication.
 *
 * Posts are sorted chronologically before extraction. Duplicates
 * (same normalized text + bits + time bucket) are skipped.
 *
 * @param signalPosts - Array of signal posts
 * @param featureSet - Features to extract
 * @param lengthThreshold - Threshold for length feature
 * @returns Accumulated bit array
 */
export async function extractBits(
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
    const dedupKey = await computeDeduplicationKey(
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
 * Compute deduplication key for a signal post.
 * Per spec: SHA256(normalized_text || extracted_bits || timestamp_bucket)
 *
 * @param text - Post text
 * @param extractedBits - Bits extracted from post
 * @param timestamp - ISO 8601 timestamp
 * @returns Hex string deduplication key
 */
async function computeDeduplicationKey(
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
