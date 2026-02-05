// Module: core/protocol/framing
// Message frame encoding/decoding for StegoChannel
// Implements SPEC.md Section 8

import { hmacSha256, constantTimeEqual, sha256, concat, stringToBytes, xchachaPoly1305Encrypt, xchachaPoly1305Decrypt } from '../crypto';
import { rsEncode, rsDecode } from './reed-solomon';

/**
 * Message frame structure (SPEC.md Section 8.1):
 * [version:4bits][flags:4bits][length:16bits][payload:N bits][auth_tag:64bits]
 */

const PROTOCOL_VERSION = 0x0;

// Flag bits
const FLAG_ENCRYPTED = 0x01; // Bit 0
// const FLAG_COMPRESSED = 0x02; // Bit 1 (reserved, always 0 for now)

/**
 * Convert bytes to bits (MSB first)
 */
export function frameToBits(frame: Uint8Array): number[] {
  const bits: number[] = [];
  for (let i = 0; i < frame.length; i++) {
    for (let bit = 7; bit >= 0; bit--) {
      bits.push((frame[i] >> bit) & 1);
    }
  }
  return bits;
}

/**
 * Convert bits to bytes (MSB first)
 */
export function bitsToFrame(bits: number[]): Uint8Array {
  const byteCount = Math.ceil(bits.length / 8);
  const frame = new Uint8Array(byteCount);

  for (let i = 0; i < bits.length; i++) {
    const byteIndex = Math.floor(i / 8);
    const bitIndex = 7 - (i % 8);
    if (bits[i]) {
      frame[byteIndex] |= (1 << bitIndex);
    }
  }

  return frame;
}

/**
 * Derive nonce for encryption (SPEC.md Section 8.2)
 * nonce = SHA256(epoch_key || "nonce" || uint64_be(seq_num))[0:24]
 */
async function deriveNonce(epochKey: Uint8Array, messageSeqNum: number): Promise<Uint8Array> {
  const seqBuffer = new Uint8Array(8);
  const view = new DataView(seqBuffer.buffer);
  view.setBigUint64(0, BigInt(messageSeqNum), false); // big-endian

  const input = concat(epochKey, stringToBytes('nonce'), seqBuffer);
  const hash = await sha256(input);
  return hash.subarray(0, 24); // XChaCha20 uses 24-byte nonce
}

/**
 * Compute HMAC-SHA256 auth tag (truncated to 64 bits)
 */
async function computeAuthTag(epochKey: Uint8Array, frameWithoutAuth: Uint8Array): Promise<Uint8Array> {
  // hmacSha256 already returns truncated 64-bit tag
  return hmacSha256(epochKey, frameWithoutAuth);
}

/**
 * Encode a message frame (SPEC.md Section 8)
 *
 * @param payload - Message payload bytes
 * @param epochKey - 32-byte epoch key
 * @param encrypted - Whether to encrypt the payload
 * @param messageSeqNum - Message sequence number (for nonce derivation)
 * @returns Complete frame as Uint8Array
 */
export async function encodeFrame(
  payload: Uint8Array,
  epochKey: Uint8Array,
  encrypted: boolean = false,
  messageSeqNum: number = 0
): Promise<Uint8Array> {
  if (epochKey.length !== 32) {
    throw new Error('Epoch key must be 32 bytes');
  }

  let processedPayload = payload;

  // If encrypted, encrypt the payload (SPEC.md Section 8.2)
  if (encrypted) {
    const nonce = await deriveNonce(epochKey, messageSeqNum);
    processedPayload = xchachaPoly1305Encrypt(epochKey, nonce, payload);
    // processedPayload is now payload.length + 16 (Poly1305 auth tag)
  }

  // Build frame header
  const version = PROTOCOL_VERSION; // 4 bits
  let flags = 0x0; // 4 bits
  if (encrypted) flags |= FLAG_ENCRYPTED;

  const versionFlags = ((version & 0x0F) << 4) | (flags & 0x0F); // Combine into 1 byte
  const payloadLengthBits = processedPayload.length * 8; // Length in bits

  // Build frame without auth tag
  const frameWithoutAuth = new Uint8Array(3 + processedPayload.length);
  frameWithoutAuth[0] = versionFlags;
  frameWithoutAuth[1] = (payloadLengthBits >> 8) & 0xFF; // Length high byte
  frameWithoutAuth[2] = payloadLengthBits & 0xFF; // Length low byte
  frameWithoutAuth.set(processedPayload, 3);

  // Compute auth tag (SPEC.md Section 8.1)
  const authTag = await computeAuthTag(epochKey, frameWithoutAuth);

  // Combine into complete frame
  const completeFrame = new Uint8Array(frameWithoutAuth.length + authTag.length);
  completeFrame.set(frameWithoutAuth, 0);
  completeFrame.set(authTag, frameWithoutAuth.length);

  // Apply Reed-Solomon error correction (SPEC.md Section 8.4)
  // protected_message = RS_encode(message_frame, ecc_symbols=8)
  const protectedFrame = rsEncode(completeFrame, 8);

  return protectedFrame;
}

/**
 * Decode and verify a message frame (SPEC.md Section 8)
 *
 * @param frameBytes - Complete frame bytes
 * @param epochKey - 32-byte epoch key
 * @param messageSeqNum - Message sequence number (for nonce derivation)
 * @returns Decoded frame with verification status
 */
export async function decodeFrame(
  frameBytes: Uint8Array,
  epochKey: Uint8Array,
  messageSeqNum: number = 0
): Promise<{
  version: number;
  flags: number;
  payload: Uint8Array;
  valid: boolean;
  encrypted: boolean;
}> {
  if (epochKey.length !== 32) {
    throw new Error('Epoch key must be 32 bytes');
  }

  // Minimum size: 1 header + 2 length + 8 auth + 8 RS ECC = 19 bytes
  if (frameBytes.length < 19) {
    return {
      version: 0,
      flags: 0,
      payload: new Uint8Array(0),
      valid: false,
      encrypted: false
    };
  }

  // Apply Reed-Solomon error correction (SPEC.md Section 8.4)
  // This corrects up to 4 symbol errors
  let correctedFrame: Uint8Array;
  try {
    correctedFrame = rsDecode(frameBytes, 8);
  } catch {
    // Too many errors to correct
    return {
      version: 0,
      flags: 0,
      payload: new Uint8Array(0),
      valid: false,
      encrypted: false
    };
  }

  if (correctedFrame.length < 11) { // Minimum: 1 byte header + 2 bytes length + 8 bytes auth tag
    return {
      version: 0,
      flags: 0,
      payload: new Uint8Array(0),
      valid: false,
      encrypted: false
    };
  }

  // Parse header
  const versionFlags = correctedFrame[0];
  const version = (versionFlags >> 4) & 0x0F;
  const flags = versionFlags & 0x0F;
  const encrypted = (flags & FLAG_ENCRYPTED) !== 0;

  // Parse length (in bits)
  const lengthBits = (correctedFrame[1] << 8) | correctedFrame[2];
  const lengthBytes = Math.ceil(lengthBits / 8);

  // Check frame size consistency
  const expectedFrameSize = 3 + lengthBytes + 8; // header + payload + auth_tag
  if (correctedFrame.length < expectedFrameSize) {
    return {
      version,
      flags,
      payload: new Uint8Array(0),
      valid: false,
      encrypted
    };
  }

  // Extract payload and auth tag
  const encryptedPayload = correctedFrame.subarray(3, 3 + lengthBytes);
  const receivedAuthTag = correctedFrame.subarray(3 + lengthBytes, 3 + lengthBytes + 8);

  // Verify auth tag
  const frameWithoutAuth = correctedFrame.subarray(0, 3 + lengthBytes);
  const expectedAuthTag = await computeAuthTag(epochKey, frameWithoutAuth);

  const authValid = constantTimeEqual(receivedAuthTag, expectedAuthTag);

  if (!authValid) {
    return {
      version,
      flags,
      payload: new Uint8Array(0),
      valid: false,
      encrypted
    };
  }

  // Decrypt if needed
  let payload = encryptedPayload;
  if (encrypted) {
    try {
      const nonce = await deriveNonce(epochKey, messageSeqNum);
      payload = xchachaPoly1305Decrypt(epochKey, nonce, encryptedPayload);
    } catch {
      return { version, flags, payload: new Uint8Array(0), valid: false, encrypted };
    }
  }

  return {
    version,
    flags,
    payload,
    valid: true,
    encrypted
  };
}
