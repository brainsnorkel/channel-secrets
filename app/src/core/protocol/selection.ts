// Module: core/protocol/selection
// Post selection algorithm for StegoChannel (SPEC.md Section 6)

import { sha256, concat, stringToBytes, constantTimeLessThan } from '../crypto';

/**
 * Compute the selection hash for a post.
 * Implements: selection_hash = SHA256(epoch_key || UTF8(post_id))
 *
 * @param epochKey - Epoch-specific derived key (32 bytes)
 * @param postId - Platform-specific post identifier
 * @returns SHA-256 hash (32 bytes)
 */
export async function computeSelectionHash(
  epochKey: Uint8Array,
  postId: string
): Promise<Uint8Array> {
  const postIdBytes = stringToBytes(postId);
  const combined = concat(epochKey, postIdBytes);
  return sha256(combined);
}

/**
 * Extract the selection value from a selection hash.
 * Implements: selection_value = bytes_to_uint64_be(selection_hash[0:8])
 *
 * @param selectionHash - SHA-256 hash from computeSelectionHash (32 bytes)
 * @returns Selection value as bigint (first 8 bytes interpreted as big-endian uint64)
 */
export function getSelectionValue(selectionHash: Uint8Array): bigint {
  if (selectionHash.length < 8) {
    throw new Error('Selection hash must be at least 8 bytes');
  }

  // Extract first 8 bytes and convert to big-endian uint64
  let value = 0n;
  for (let i = 0; i < 8; i++) {
    value = (value << 8n) | BigInt(selectionHash[i]);
  }

  return value;
}

/**
 * Compute the selection threshold for a given selection rate.
 * Implements: threshold = floor(rate * 2^64)
 *
 * Per SPEC.md: "threshold = (2^64 - 1) * selection_rate"
 * For rate=0.25: threshold = 0x3FFFFFFFFFFFFFFF = 4611686018427387903
 *
 * @param rate - Selection rate (0.0 to 1.0, default 0.25)
 * @returns Threshold value as bigint
 */
export function computeThreshold(rate: number = 0.25): bigint {
  if (rate < 0 || rate > 1) {
    throw new Error('Selection rate must be between 0 and 1');
  }

  // threshold = floor(rate * (2^64 - 1))
  // Using pure bigint arithmetic to avoid IEEE 754 precision loss.
  // Number(0xFFFFFFFFFFFFFFFFn) rounds to 2^64, losing the -1 and
  // overflowing uint64 range for rates near 1.0.
  const maxUint64 = 0xFFFFFFFFFFFFFFFFn;

  // Convert rate to integer fraction with 9 digits of precision.
  // e.g. rate=0.25 → numerator=250000000, denominator=1000000000
  const precision = 1_000_000_000n;
  const numerator = BigInt(Math.round(rate * Number(precision)));
  const threshold = (maxUint64 * numerator) / precision;

  return threshold;
}

/**
 * Determine if a post is selected as a signal post.
 * Implements: selected = (selection_value < threshold)
 *
 * A post is a SIGNAL POST if its selection value is below the threshold.
 *
 * Test vector (SPEC.md Section 13.2):
 * - epoch_key = 0x8b2c5a9f...
 * - post_id = "3jxyz123abc"
 * - selection_value = 0x2a4e6c8f1b3d5a7e = 3049827156438219390
 * - threshold (rate=0.25) = 0x3FFFFFFFFFFFFFFF = 4611686018427387903
 * - Result: 3049827156438219390 < 4611686018427387903 = true (SIGNAL POST)
 *
 * @param epochKey - Epoch-specific derived key (32 bytes)
 * @param postId - Platform-specific post identifier
 * @param rate - Selection rate (0.0 to 1.0, default 0.25)
 * @returns true if post is selected as signal post, false otherwise
 */
export async function isSignalPost(
  epochKey: Uint8Array,
  postId: string,
  rate: number = 0.25
): Promise<boolean> {
  const selectionHash = await computeSelectionHash(epochKey, postId);
  const selectionValue = getSelectionValue(selectionHash);
  const threshold = computeThreshold(rate);

  return constantTimeLessThan(selectionValue, threshold);
}
