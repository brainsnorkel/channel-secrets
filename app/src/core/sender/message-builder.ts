// Module: core/sender/message-builder
// Message frame encoding for StegoChannel sender pipeline (SPEC.md Section 8)

import { encodeFrame, frameToBits } from '../protocol/framing';

/**
 * Build a message frame from a plaintext payload.
 * Wraps protocol framing functions into a single call for the sender pipeline.
 *
 * @param payload - Message payload bytes (UTF-8 encoded plaintext)
 * @param epochKey - 32-byte epoch key for authentication/encryption
 * @param encrypted - Whether to encrypt the payload (default false)
 * @param seqNum - Message sequence number for nonce derivation
 * @returns Encoded frame bytes and the corresponding bit array
 */
export async function buildMessageFrame(
  payload: Uint8Array,
  epochKey: Uint8Array,
  encrypted: boolean,
  seqNum: number
): Promise<{ frame: Uint8Array; frameBits: number[] }> {
  const frame = await encodeFrame(payload, epochKey, encrypted, seqNum);
  const frameBits = frameToBits(frame);
  return { frame, frameBits };
}
