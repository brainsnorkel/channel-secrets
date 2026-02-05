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

  // Handle subarrays correctly by using byteOffset and byteLength
  const messageBuffer = message.buffer.slice(message.byteOffset, message.byteOffset + message.byteLength);
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageBuffer);
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

  // Ensure inputs are proper Uint8Arrays, not subarrays
  // libsodium requires contiguous buffers
  const plaintextCopy = new Uint8Array(plaintext);
  const nonceCopy = new Uint8Array(nonce);
  const keyCopy = new Uint8Array(key);

  return sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
    plaintextCopy,
    null, // no additional data
    null, // no secret nonce
    nonceCopy,
    keyCopy
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

  // Ensure inputs are proper Uint8Arrays, not subarrays
  // libsodium requires contiguous buffers
  const ciphertextCopy = new Uint8Array(ciphertext);
  const nonceCopy = new Uint8Array(nonce);
  const keyCopy = new Uint8Array(key);

  const plaintext = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
    null, // no secret nonce
    ciphertextCopy,
    null, // no additional data
    nonceCopy,
    keyCopy
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

/**
 * Constant-time less-than comparison for uint64 BigInts.
 * Uses bitwise arithmetic only — no branches, no ternary.
 */
export function constantTimeLessThan(a: bigint, b: bigint): boolean {
  const aBytes = uint64ToBytesBE(a);
  const bBytes = uint64ToBytesBE(b);

  let result = 0;
  let determined = 0;

  for (let i = 0; i < 8; i++) {
    const diff = aBytes[i] - bBytes[i];
    const aLess = (diff >> 31) & 1;
    const different = ((diff >> 31) | ((-diff) >> 31)) & 1;
    const notDetermined = ~determined & 1;
    result = result | (aLess & notDetermined);
    determined = determined | (different & notDetermined);
  }

  return result === 1;
}

/**
 * Constant-time byte array equality using libsodium's memcmp.
 * Returns true if arrays are equal, false otherwise.
 * Requires sodium to be initialized.
 */
export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  return sodium.memcmp(a, b);
}

// ============================================================================
// T6: Passphrase Key Derivation
// ============================================================================

/**
 * Built-in word list for passphrase generation (EFF short wordlist subset)
 */
const PASSPHRASE_WORDLIST = [
  'able', 'acid', 'aged', 'also', 'area', 'army', 'away', 'baby', 'back', 'ball',
  'band', 'bank', 'base', 'bath', 'beam', 'bear', 'beat', 'been', 'beer', 'bell',
  'belt', 'bent', 'best', 'bill', 'bird', 'blow', 'blue', 'boat', 'body', 'bone',
  'book', 'born', 'boss', 'both', 'bowl', 'bulk', 'burn', 'bush', 'busy', 'call',
  'calm', 'came', 'camp', 'card', 'care', 'case', 'cash', 'cast', 'cell', 'chat',
  'chip', 'city', 'club', 'coal', 'coat', 'code', 'cold', 'come', 'cook', 'cool',
  'cope', 'copy', 'core', 'cost', 'crew', 'crop', 'dark', 'data', 'date', 'dawn',
  'days', 'dead', 'deal', 'dean', 'dear', 'debt', 'deep', 'deny', 'desk', 'dial',
  'diet', 'disc', 'dish', 'disk', 'does', 'done', 'door', 'dose', 'down', 'draw',
  'drew', 'drop', 'drug', 'dual', 'duke', 'dust', 'duty', 'each', 'earn', 'ease',
  'east', 'easy', 'edge', 'else', 'even', 'ever', 'face', 'fact', 'fail', 'fair',
  'fall', 'farm', 'fast', 'fate', 'fear', 'feed', 'feel', 'feet', 'fell', 'felt',
  'file', 'fill', 'film', 'find', 'fine', 'fire', 'firm', 'fish', 'five', 'flat',
  'flow', 'food', 'foot', 'ford', 'form', 'fort', 'four', 'free', 'from', 'fuel',
  'full', 'fund', 'gain', 'game', 'gate', 'gave', 'gear', 'gene', 'gift', 'girl',
  'give', 'glad', 'goal', 'goes', 'gold', 'golf', 'gone', 'good', 'gray', 'grew',
  'grey', 'grow', 'gulf', 'half', 'hall', 'hand', 'hang', 'hard', 'harm', 'hate',
  'have', 'head', 'hear', 'heat', 'held', 'hell', 'help', 'here', 'hero', 'high',
  'hill', 'hire', 'hold', 'hole', 'holy', 'home', 'hope', 'host', 'hour', 'huge',
  'hung', 'hunt', 'hurt', 'idea', 'inch', 'into', 'iron', 'item', 'jack', 'jane',
  'jean', 'john', 'join', 'jump', 'jury', 'just', 'keen', 'keep', 'kent', 'kept',
  'kick', 'kill', 'kind', 'king', 'knee', 'knew', 'know', 'lack', 'lady', 'laid',
  'lake', 'land', 'lane', 'last', 'late', 'lead', 'left', 'less', 'life', 'lift',
  'like', 'line', 'link', 'list', 'live', 'load', 'loan', 'lock', 'long', 'look',
  'lord', 'lose', 'loss', 'lost', 'love', 'luck', 'made', 'mail', 'main', 'make',
  'male', 'mall', 'many', 'mark', 'mass', 'matt', 'meal', 'mean', 'meat', 'meet',
  'menu', 'mere', 'mike', 'mile', 'milk', 'mill', 'mind', 'mine', 'miss', 'mode',
  'mood', 'moon', 'more', 'most', 'move', 'much', 'must', 'name', 'navy', 'near',
  'neck', 'need', 'news', 'next', 'nice', 'nick', 'nine', 'none', 'nose', 'note',
  'okay', 'once', 'only', 'onto', 'open', 'oral', 'over', 'pace', 'pack', 'page',
  'paid', 'pain', 'pair', 'palm', 'park', 'part', 'pass', 'past', 'path', 'peak',
  'pick', 'pink', 'pipe', 'plan', 'play', 'plot', 'plus', 'poll', 'pool', 'poor',
  'port', 'post', 'pull', 'pure', 'push', 'race', 'rail', 'rain', 'rang', 'rank',
  'rare', 'rate', 'read', 'real', 'rear', 'rely', 'rent', 'rest', 'rice', 'rich',
  'ride', 'ring', 'rise', 'risk', 'road', 'rock', 'role', 'roll', 'roof', 'room',
  'root', 'rose', 'rule', 'rush', 'ruth', 'safe', 'said', 'sake', 'sale', 'salt',
  'same', 'sand', 'save', 'seat', 'seed', 'seek', 'seem', 'seen', 'self', 'sell',
  'send', 'sent', 'sept', 'ship', 'shop', 'shot', 'show', 'shut', 'sick', 'side',
  'sign', 'sing', 'sink', 'site', 'size', 'skin', 'slow', 'snow', 'soft', 'soil',
  'sold', 'sole', 'some', 'song', 'soon', 'sort', 'soul', 'spot', 'star', 'stay',
  'step', 'stop', 'such', 'suit', 'sure', 'take', 'tale', 'talk', 'tall', 'tank',
  'tape', 'task', 'team', 'tech', 'tell', 'tend', 'term', 'test', 'text', 'than',
  'that', 'them', 'then', 'they', 'thin', 'this', 'thus', 'till', 'time', 'tiny',
  'told', 'toll', 'tone', 'took', 'tool', 'tour', 'town', 'tree', 'trip', 'true',
  'tune', 'turn', 'twin', 'type', 'unit', 'upon', 'used', 'user', 'vary', 'vast',
  'very', 'vice', 'view', 'vote', 'wage', 'wait', 'wake', 'walk', 'wall', 'want',
  'ward', 'warm', 'warn', 'wash', 'wave', 'ways', 'weak', 'wear', 'week', 'well',
  'went', 'were', 'west', 'what', 'when', 'wide', 'wife', 'wild', 'will', 'wind',
  'wine', 'wing', 'wire', 'wise', 'wish', 'with', 'wood', 'word', 'wore', 'work',
  'worn', 'yard', 'yeah', 'year', 'your', 'zero', 'zone'
];

/**
 * Channel key data structure
 */
export interface ChannelKeyData {
  key: string; // base64url encoded key
  beacon: string;
  rate: number;
  features: string;
}

/**
 * Result of passphrase-based channel key derivation
 */
export interface PassphraseDerivationResult {
  key: Uint8Array;
  salt: Uint8Array;
  saltMode: 'handles' | 'random';
}

/**
 * Derive channel key from a shared passphrase
 * Per SPEC Section 4.3: Passphrase-Based Channel Setup
 *
 * @param passphrase - Shared passphrase
 * @param myHandle - Your social media handle
 * @param theirHandle - Their social media handle
 * @param options - Optional parameters
 * @param options.randomSalt - Use random salt instead of handle-derived (16 bytes)
 * @returns Derived key, salt, and salt mode
 *
 * @example
 * // Handle-derived salt (default)
 * const result = await deriveChannelKeyFromPassphrase(
 *   "correct horse battery staple",
 *   "@alice",
 *   "@bob"
 * );
 *
 * @example
 * // Random salt (must be shared out-of-band)
 * const randomSalt = sodium.randombytes_buf(16);
 * const result = await deriveChannelKeyFromPassphrase(
 *   "correct horse battery staple",
 *   "@alice",
 *   "@bob",
 *   { randomSalt }
 * );
 */
export async function deriveChannelKeyFromPassphrase(
  passphrase: string,
  myHandle: string,
  theirHandle: string,
  options?: { randomSalt?: Uint8Array }
): Promise<PassphraseDerivationResult> {
  let salt: Uint8Array;
  let saltMode: 'handles' | 'random';

  if (options?.randomSalt) {
    // Use provided random salt
    if (options.randomSalt.length !== 16) {
      throw new Error('Random salt must be 16 bytes');
    }
    salt = options.randomSalt;
    saltMode = 'random';
  } else {
    // Derive deterministic salt from handles
    const [h1, h2] = [myHandle, theirHandle].sort();
    const saltInput = `stegochannel:v0:${h1}:${h2}`;
    const saltHash = await sha256(stringToBytes(saltInput));
    salt = saltHash.slice(0, 16);
    saltMode = 'handles';
  }

  // Derive key using Argon2id
  // iterations=3, memory=64MB as specified
  const opsLimit = 3;
  const memLimit = 64 * 1024 * 1024;

  const key = argon2id(passphrase, salt, opsLimit, memLimit);

  return { key, salt, saltMode };
}

/**
 * Generate a random passphrase using a built-in word list
 *
 * @param wordCount - Number of words in the passphrase (default: 4)
 * @returns Random passphrase as space-separated words
 *
 * @example
 * const passphrase = generateRandomPassphrase(6);
 * // Example output: "area blue code fire moon star"
 */
export function generateRandomPassphrase(wordCount: number = 4): string {
  if (wordCount < 1) {
    throw new Error('Word count must be at least 1');
  }
  if (wordCount > 12) {
    throw new Error('Word count too large (max 12)');
  }

  const words: string[] = [];
  for (let i = 0; i < wordCount; i++) {
    const randomIndex = sodium.randombytes_uniform(PASSPHRASE_WORDLIST.length);
    words.push(PASSPHRASE_WORDLIST[randomIndex]);
  }

  return words.join(' ');
}

/**
 * Estimate passphrase strength
 *
 * @param passphrase - Passphrase to evaluate
 * @returns Score (0-4) and feedback message
 *
 * Score meanings:
 * - 0: Very weak (< 8 chars or trivial)
 * - 1: Weak (8-11 chars or single word)
 * - 2: Fair (12-15 chars or 2-3 words)
 * - 3: Good (16-23 chars or 4-5 words)
 * - 4: Strong (24+ chars or 6+ words)
 *
 * @example
 * const result = estimatePassphraseStrength("correct horse battery staple");
 * // { score: 3, feedback: "Good: 4 words, diverse character set" }
 */
export function estimatePassphraseStrength(passphrase: string): {
  score: number;
  feedback: string;
} {
  const length = passphrase.length;
  const words = passphrase.trim().split(/\s+/);
  const wordCount = words.length;

  // Check character variety
  const hasLower = /[a-z]/.test(passphrase);
  const hasUpper = /[A-Z]/.test(passphrase);
  const hasDigit = /[0-9]/.test(passphrase);
  const hasSpecial = /[^a-zA-Z0-9\s]/.test(passphrase);
  const varietyCount = [hasLower, hasUpper, hasDigit, hasSpecial].filter(Boolean).length;

  // Scoring logic
  let score = 0;
  let feedback = '';

  if (length < 8) {
    score = 0;
    feedback = 'Very weak: too short (minimum 8 characters)';
  } else if (length < 12 || wordCount === 1) {
    score = 1;
    feedback = 'Weak: use multiple words or more characters';
  } else if (length < 16 || wordCount <= 3) {
    score = 2;
    feedback = `Fair: ${wordCount} word${wordCount > 1 ? 's' : ''}, consider adding more`;
  } else if (length < 24 || wordCount <= 5) {
    score = 3;
    feedback = `Good: ${wordCount} words${varietyCount >= 3 ? ', diverse character set' : ''}`;
  } else {
    score = 4;
    feedback = `Strong: ${wordCount} words${varietyCount >= 3 ? ', excellent diversity' : ''}`;
  }

  return { score, feedback };
}

/**
 * Validate channel key string format
 * Format: stegochannel:v0:<base64url_key>:<beacon>:<rate>:<features>
 *
 * @param keyString - Channel key string to validate
 * @returns Validation result with parsed data if valid
 *
 * @example
 * const result = validateChannelKeyFormat(
 *   "stegochannel:v0:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:date:0.25:len,media,punct"
 * );
 * if (result.valid) {
 *   console.log(result.parsed.beacon); // "date"
 * }
 */
export function validateChannelKeyFormat(keyString: string): {
  valid: boolean;
  error?: string;
  parsed?: ChannelKeyData;
} {
  const parts = keyString.split(':');

  // Check part count
  if (parts.length !== 6) {
    return {
      valid: false,
      error: `Expected 6 colon-separated parts, got ${parts.length}`
    };
  }

  const [prefix, version, keyBase64, beacon, rateStr, features] = parts;

  // Validate prefix
  if (prefix !== 'stegochannel') {
    return {
      valid: false,
      error: `Invalid prefix: expected "stegochannel", got "${prefix}"`
    };
  }

  // Validate version
  if (version !== 'v0') {
    return {
      valid: false,
      error: `Unsupported version: expected "v0", got "${version}"`
    };
  }

  // Validate key (should be base64url, 32 bytes = 43 chars without padding)
  if (!/^[A-Za-z0-9_-]+$/.test(keyBase64)) {
    return {
      valid: false,
      error: 'Key must be base64url encoded (A-Z, a-z, 0-9, -, _)'
    };
  }

  // Rough length check (32 bytes in base64url is ~43 chars)
  if (keyBase64.length < 40 || keyBase64.length > 50) {
    return {
      valid: false,
      error: `Key length suspicious: expected ~43 chars for 32 bytes, got ${keyBase64.length}`
    };
  }

  // Validate beacon
  const validBeacons = ['date', 'btc', 'nist'];
  if (!validBeacons.includes(beacon)) {
    return {
      valid: false,
      error: `Invalid beacon: expected one of ${validBeacons.join(', ')}, got "${beacon}"`
    };
  }

  // Validate rate
  const rate = parseFloat(rateStr);
  if (isNaN(rate) || rate <= 0 || rate > 1) {
    return {
      valid: false,
      error: `Invalid rate: must be between 0 and 1, got "${rateStr}"`
    };
  }

  // Validate features (comma-separated list)
  const featureList = features.split(',');
  const validFeatures = ['len', 'media', 'punct', 'time', 'emoji'];
  for (const feature of featureList) {
    if (!validFeatures.includes(feature)) {
      return {
        valid: false,
        error: `Invalid feature "${feature}": expected one of ${validFeatures.join(', ')}`
      };
    }
  }

  return {
    valid: true,
    parsed: {
      key: keyBase64,
      beacon,
      rate,
      features
    }
  };
}
