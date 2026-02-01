// Module: core/crypto
// StegoChannel cryptographic primitives

import sodium from 'libsodium-wrappers-sumo';

export type Sodium = typeof sodium;

/**
 * Initialize libsodium-wrappers
 * Must be called before using any crypto functions
 */
export async function initSodium(): Promise<Sodium> {
  await sodium.ready;
  return sodium;
}

/**
 * HKDF-Expand using SHA-256 (RFC 5869)
 *
 * @param prk - Pseudorandom key (32 bytes)
 * @param info - Context and application specific information
 * @param length - Desired output length in bytes
 * @returns Derived key material
 */
export async function hkdfExpand(
  prk: Uint8Array,
  info: string,
  length: number
): Promise<Uint8Array> {
  const infoBytes = new TextEncoder().encode(info);
  const hashLen = 32; // SHA-256 output length
  const n = Math.ceil(length / hashLen);

  if (n > 255) {
    throw new Error('HKDF-Expand: requested length too long');
  }

  const okm = new Uint8Array(length);
  let previous = new Uint8Array(0);
  let offset = 0;

  for (let i = 1; i <= n; i++) {
    // T(i) = HMAC-Hash(PRK, T(i-1) | info | i)
    const hmacInput = new Uint8Array(previous.length + infoBytes.length + 1);
    hmacInput.set(previous, 0);
    hmacInput.set(infoBytes, previous.length);
    hmacInput[previous.length + infoBytes.length] = i;

    const key = await crypto.subtle.importKey(
      'raw',
      prk.buffer as ArrayBuffer,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, hmacInput.buffer as ArrayBuffer);
    previous = new Uint8Array(signature);

    const copyLen = Math.min(hashLen, length - offset);
    okm.set(previous.subarray(0, copyLen), offset);
    offset += copyLen;
  }

  return okm;
}

/**
 * SHA-256 hash using Web Crypto API
 *
 * @param data - Input data to hash
 * @returns SHA-256 hash (32 bytes)
 */
export async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data.buffer as ArrayBuffer);
  return new Uint8Array(hashBuffer);
}

/**
 * HMAC-SHA256, truncated to 64 bits (8 bytes)
 *
 * @param key - Secret key
 * @param message - Message to authenticate
 * @returns Truncated HMAC tag (8 bytes)
 */
export async function hmacSha256(
  key: Uint8Array,
  message: Uint8Array
): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key.buffer as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, message.buffer as ArrayBuffer);
  const fullHmac = new Uint8Array(signature);

  // Truncate to 64 bits (8 bytes) as per SPEC Section 8.1
  return fullHmac.slice(0, 8);
}

/**
 * XChaCha20-Poly1305 encryption using libsodium
 *
 * @param key - Encryption key (32 bytes)
 * @param nonce - Nonce (24 bytes)
 * @param plaintext - Plaintext to encrypt
 * @returns Ciphertext with authentication tag
 */
export function xchachaPoly1305Encrypt(
  key: Uint8Array,
  nonce: Uint8Array,
  plaintext: Uint8Array
): Uint8Array {
  if (key.length !== 32) {
    throw new Error('XChaCha20-Poly1305: key must be 32 bytes');
  }
  if (nonce.length !== 24) {
    throw new Error('XChaCha20-Poly1305: nonce must be 24 bytes');
  }

  return sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
    plaintext,
    null, // no additional data
    null, // no secret nonce
    nonce,
    key
  );
}

/**
 * XChaCha20-Poly1305 decryption using libsodium
 *
 * @param key - Decryption key (32 bytes)
 * @param nonce - Nonce (24 bytes)
 * @param ciphertext - Ciphertext with authentication tag
 * @returns Plaintext if authentication succeeds
 * @throws Error if authentication fails
 */
export function xchachaPoly1305Decrypt(
  key: Uint8Array,
  nonce: Uint8Array,
  ciphertext: Uint8Array
): Uint8Array {
  if (key.length !== 32) {
    throw new Error('XChaCha20-Poly1305: key must be 32 bytes');
  }
  if (nonce.length !== 24) {
    throw new Error('XChaCha20-Poly1305: nonce must be 24 bytes');
  }

  const plaintext = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
    null, // no secret nonce
    ciphertext,
    null, // no additional data
    nonce,
    key
  );

  if (!plaintext) {
    throw new Error('XChaCha20-Poly1305: decryption failed (invalid tag)');
  }

  return plaintext;
}

/**
 * Argon2id key derivation using libsodium
 *
 * @param password - Password string
 * @param salt - Salt (16 bytes)
 * @param opsLimit - Operations limit (default: moderate)
 * @param memLimit - Memory limit in bytes (default: moderate)
 * @returns Derived key (32 bytes)
 */
export function argon2id(
  password: string,
  salt: Uint8Array,
  opsLimit: number = sodium.crypto_pwhash_OPSLIMIT_MODERATE,
  memLimit: number = sodium.crypto_pwhash_MEMLIMIT_MODERATE
): Uint8Array {
  if (salt.length !== 16) {
    throw new Error('Argon2id: salt must be 16 bytes');
  }

  return sodium.crypto_pwhash(
    32, // key length
    password,
    salt,
    opsLimit,
    memLimit,
    sodium.crypto_pwhash_ALG_ARGON2ID13
  );
}

/**
 * Derive epoch key from channel key and beacon value
 * Per SPEC Section 5.1
 *
 * @param channelKey - Shared channel key (32 bytes)
 * @param beaconId - Beacon identifier (e.g., "date", "btc", "nist")
 * @param beaconValue - Beacon value for current epoch
 * @returns Epoch key (32 bytes)
 *
 * @example
 * // Test vector from SPEC Section 13.1
 * const channelKey = new Uint8Array(32);
 * channelKey[31] = 1;
 * const epochKey = await deriveEpochKey(channelKey, "date", "2025-02-01");
 * // Expected: 0x8b2c5a9f3d1e7b4a6c8f2d5e9a3b7c1d4f6e8a2b5c9d3e7f1a4b8c2d6e9f3a7b
 */
export async function deriveEpochKey(
  channelKey: Uint8Array,
  beaconId: string,
  beaconValue: string
): Promise<Uint8Array> {
  if (channelKey.length !== 32) {
    throw new Error('Channel key must be 32 bytes');
  }

  // info = beacon_id || ":" || beacon_value || ":stegochannel-v0"
  const info = `${beaconId}:${beaconValue}:stegochannel-v0`;

  // epoch_key = HKDF-Expand(channel_key, info, 32)
  return hkdfExpand(channelKey, info, 32);
}

// Helper functions for byte conversions

/**
 * Convert big-endian bytes to uint64
 * Used for post selection threshold comparison
 */
export function bytesToUint64BE(bytes: Uint8Array): bigint {
  if (bytes.length < 8) {
    throw new Error('Need at least 8 bytes for uint64');
  }

  let value = 0n;
  for (let i = 0; i < 8; i++) {
    value = (value << 8n) | BigInt(bytes[i]);
  }
  return value;
}

/**
 * Convert uint64 to big-endian bytes
 */
export function uint64ToBytesBE(value: bigint): Uint8Array {
  const bytes = new Uint8Array(8);
  for (let i = 7; i >= 0; i--) {
    bytes[i] = Number(value & 0xFFn);
    value = value >> 8n;
  }
  return bytes;
}

/**
 * Convert hex string to Uint8Array
 */
export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Convert Uint8Array to hex string
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert string to UTF-8 bytes
 */
export function stringToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Concatenate multiple Uint8Array buffers
 */
export function concat(...buffers: Uint8Array[]): Uint8Array {
  const totalLength = buffers.reduce((sum, buf) => sum + buf.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const buf of buffers) {
    result.set(buf, offset);
    offset += buf.length;
  }
  return result;
}
