// Module: core/channel
// Channel key import/export utilities

import { validateChannelKeyFormat } from './crypto/index';
import type { Channel } from '../schemas/index';

/**
 * Parsed channel key with all components extracted
 */
export interface ParsedChannelKey {
  version: number;
  key: Uint8Array;
  beaconType: 'date' | 'btc' | 'nist';
  selectionRate: number;
  featureSet: string[];
}

/**
 * Validation result with detailed error information
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  parsed?: ParsedChannelKey;
}

/**
 * Export a Channel object as a shareable key string
 * Format: stegochannel:v0:<base64url_key>:<beacon>:<rate>:<features>
 *
 * @param channel - Channel object to export
 * @returns Shareable channel key string
 *
 * @example
 * const channel = {
 *   id: '...',
 *   name: 'My Channel',
 *   key: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
 *   beaconType: 'date',
 *   selectionRate: 0.25,
 *   featureSet: 'v0',
 *   mySources: [],
 *   theirSources: [],
 *   createdAt: Date.now()
 * };
 * const keyString = exportChannelKey(channel);
 * // "stegochannel:v0:AAAA...:date:0.25:len,media,punct"
 */
export function exportChannelKey(channel: Channel): string {
  // Map feature set version to feature list
  const featureMap: Record<string, string> = {
    v0: 'len,media,punct',
    v1: 'len,media,punct,time',
    v2: 'len,media,punct,time,emoji'
  };

  const features = featureMap[channel.featureSet] || 'len,media,punct';

  return `stegochannel:v0:${channel.key}:${channel.beaconType}:${channel.selectionRate}:${features}`;
}

/**
 * Parse a channel key string into its components
 * Returns null if the string is invalid
 *
 * @param keyString - Channel key string to parse
 * @returns Parsed channel key components, or null if invalid
 *
 * @example
 * const parsed = parseChannelKey("stegochannel:v0:AAAA...:date:0.25:len,media,punct");
 * if (parsed) {
 *   console.log(parsed.beaconType); // "date"
 *   console.log(parsed.selectionRate); // 0.25
 * }
 */
export function parseChannelKey(keyString: string): ParsedChannelKey | null {
  const validation = validateChannelKeyFormat(keyString);

  if (!validation.valid || !validation.parsed) {
    return null;
  }

  const parsed = validation.parsed;

  // Decode base64url key to Uint8Array
  const key = base64urlToBytes(parsed.key);

  // Parse feature string into array
  const featureSet = parsed.features.split(',').map(f => f.trim());

  return {
    version: 0, // Currently only v0 is supported
    key,
    beaconType: parsed.beacon as 'date' | 'btc' | 'nist',
    selectionRate: parsed.rate,
    featureSet
  };
}

/**
 * Validate a channel key string with detailed error messages
 *
 * @param keyString - Channel key string to validate
 * @returns Validation result with error or parsed data
 *
 * @example
 * const result = validateChannelKey("stegochannel:v0:...");
 * if (!result.valid) {
 *   console.error(result.error);
 * } else {
 *   console.log("Valid key:", result.parsed);
 * }
 */
export function validateChannelKey(keyString: string): ValidationResult {
  // First, use the existing validation from crypto module
  const baseValidation = validateChannelKeyFormat(keyString);

  if (!baseValidation.valid) {
    return {
      valid: false,
      error: baseValidation.error
    };
  }

  if (!baseValidation.parsed) {
    return {
      valid: false,
      error: 'Validation succeeded but no parsed data returned'
    };
  }

  const parsed = baseValidation.parsed;

  // Additional validation: decode the key to ensure it's valid base64url
  try {
    const keyBytes = base64urlToBytes(parsed.key);

    // Key must be exactly 32 bytes
    if (keyBytes.length !== 32) {
      return {
        valid: false,
        error: `Key must be 32 bytes, got ${keyBytes.length} bytes`
      };
    }

    // Additional validation: check rate is reasonable
    if (parsed.rate < 0.1 || parsed.rate > 0.5) {
      return {
        valid: false,
        error: `Selection rate should be between 0.1 and 0.5 for practical use, got ${parsed.rate}`
      };
    }

    // Parse feature list
    const featureSet = parsed.features.split(',').map(f => f.trim());

    // Return success with parsed data
    return {
      valid: true,
      parsed: {
        version: 0,
        key: keyBytes,
        beaconType: parsed.beacon as 'date' | 'btc' | 'nist',
        selectionRate: parsed.rate,
        featureSet
      }
    };
  } catch (error) {
    return {
      valid: false,
      error: `Failed to decode key: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Convert base64url string to Uint8Array
 * Base64url uses URL-safe alphabet: A-Z, a-z, 0-9, -, _
 * No padding is used
 *
 * @param base64url - Base64url encoded string
 * @returns Decoded bytes
 */
function base64urlToBytes(base64url: string): Uint8Array {
  // Convert base64url to standard base64
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');

  // Add padding if needed
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }

  // Decode using browser's atob
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);

  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes;
}

/**
 * Convert Uint8Array to base64url string
 * Used internally by exportChannelKey
 *
 * @param bytes - Bytes to encode
 * @returns Base64url encoded string (no padding)
 */
export function bytesToBase64url(bytes: Uint8Array): string {
  // Convert to binary string
  let binaryString = '';
  for (let i = 0; i < bytes.length; i++) {
    binaryString += String.fromCharCode(bytes[i]);
  }

  // Encode to base64
  const base64 = btoa(binaryString);

  // Convert to base64url (remove padding, replace chars)
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
