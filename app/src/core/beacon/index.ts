// Module: core/beacon
// StegoChannel beacon synchronization and epoch key derivation

import { deriveEpochKey } from '../crypto';

/**
 * Supported beacon types
 */
export type BeaconType = 'btc' | 'nist' | 'date';

/**
 * Epoch information for a beacon type
 */
export interface EpochInfo {
  /** Approximate epoch duration in seconds */
  epochDuration: number;
  /** Grace period in seconds for checking previous epochs */
  gracePeriod: number;
  /** Number of previous epochs to check during grace period */
  epochsToCheck: number;
}

/**
 * Cached beacon value
 */
interface BeaconCacheEntry {
  value: string;
  timestamp: number;
  expiresAt: number;
}

/**
 * Beacon cache: beaconType -> cached value
 */
const beaconCache = new Map<BeaconType, BeaconCacheEntry>();

/**
 * Get epoch information for a beacon type
 * Per SPEC Section 4.1
 *
 * @param beaconType - Beacon type
 * @returns Epoch duration and grace period configuration
 */
export function getEpochInfo(beaconType: BeaconType): EpochInfo {
  switch (beaconType) {
    case 'btc':
      return {
        epochDuration: 600, // ~10 minutes (average)
        gracePeriod: 120, // 2 minutes
        epochsToCheck: 2, // Current + previous 2 epochs
      };
    case 'nist':
      return {
        epochDuration: 60, // 1 minute
        gracePeriod: 30, // 30 seconds
        epochsToCheck: 1, // Current + previous epoch
      };
    case 'date':
      return {
        epochDuration: 86400, // 24 hours
        gracePeriod: 300, // 5 minutes
        epochsToCheck: 1, // Current + previous epoch
      };
  }
}

/**
 * Fetch latest Bitcoin block hash
 * Primary: blockchain.info, Fallback: blockstream.info
 * Per beacon-sync spec requirement
 *
 * @returns Latest Bitcoin block hash (hex string)
 * @throws Error if both APIs fail
 */
export async function fetchBitcoinBeacon(): Promise<string> {
  // Try primary API first
  try {
    const response = await fetch('https://blockchain.info/q/latesthash', {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const hash = (await response.text()).trim();

    if (!/^[0-9a-f]{64}$/i.test(hash)) {
      throw new Error('Invalid hash format from blockchain.info');
    }

    return hash.toLowerCase();
  } catch (primaryError) {
    console.warn('blockchain.info failed, trying fallback:', primaryError);

    // Try fallback API
    try {
      const response = await fetch('https://blockstream.info/api/blocks/tip/hash', {
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const hash = (await response.text()).trim();

      if (!/^[0-9a-f]{64}$/i.test(hash)) {
        throw new Error('Invalid hash format from blockstream.info');
      }

      return hash.toLowerCase();
    } catch (fallbackError) {
      throw new Error(
        `Both Bitcoin APIs failed. Primary: ${primaryError}. Fallback: ${fallbackError}`
      );
    }
  }
}

/**
 * Fetch current NIST Randomness Beacon value
 * Per beacon-sync spec requirement
 *
 * @returns NIST outputValue (hex string)
 * @throws Error if API fails
 */
export async function fetchNistBeacon(): Promise<string> {
  try {
    const response = await fetch('https://beacon.nist.gov/beacon/2.0/pulse/last', {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`NIST API returned HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data.pulse?.outputValue) {
      throw new Error('NIST response missing pulse.outputValue field');
    }

    const outputValue = String(data.pulse.outputValue).toLowerCase();

    // NIST outputValue should be a 512-bit hex string (128 hex chars)
    if (!/^[0-9a-f]{128}$/i.test(outputValue)) {
      throw new Error('Invalid NIST outputValue format');
    }

    return outputValue;
  } catch (error) {
    throw new Error(`NIST beacon fetch failed: ${error}`);
  }
}

/**
 * Get current UTC date in ISO 8601 format
 * Per beacon-sync spec requirement
 *
 * @returns Current UTC date string (YYYY-MM-DD)
 */
export function fetchDateBeacon(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Get beacon value with caching
 * Per beacon-sync spec caching requirements
 *
 * @param beaconType - Beacon type to fetch
 * @returns Current beacon value
 * @throws Error if fetch fails and no cached value available
 */
export async function getBeaconValue(beaconType: BeaconType): Promise<string> {
  const now = Date.now();

  // Check cache first
  const cached = beaconCache.get(beaconType);
  if (cached && now < cached.expiresAt) {
    return cached.value;
  }

  // Determine cache duration based on beacon type
  let cacheDurationMs: number;
  let value: string;

  switch (beaconType) {
    case 'btc':
      cacheDurationMs = 60_000; // 1 minute
      value = await fetchBitcoinBeacon();
      break;

    case 'nist':
      cacheDurationMs = 30_000; // 30 seconds
      value = await fetchNistBeacon();
      break;

    case 'date':
      // Cache until next UTC midnight
      const tomorrow = new Date();
      tomorrow.setUTCHours(24, 0, 0, 0);
      cacheDurationMs = tomorrow.getTime() - now;
      value = fetchDateBeacon();
      break;
  }

  // Update cache
  beaconCache.set(beaconType, {
    value,
    timestamp: now,
    expiresAt: now + cacheDurationMs,
  });

  return value;
}

/**
 * Derive epoch key for a beacon type
 * Combines beacon fetch with epoch key derivation
 * Per SPEC Section 5.1
 *
 * @param channelKey - Shared channel key (32 bytes)
 * @param beaconType - Beacon type to use
 * @returns Epoch key for current epoch (32 bytes)
 * @throws Error if beacon fetch or derivation fails
 *
 * @example
 * const channelKey = new Uint8Array(32);
 * const epochKey = await deriveEpochKeyForBeacon(channelKey, 'date');
 */
export async function deriveEpochKeyForBeacon(
  channelKey: Uint8Array,
  beaconType: BeaconType
): Promise<Uint8Array> {
  if (channelKey.length !== 32) {
    throw new Error('Channel key must be 32 bytes');
  }

  try {
    // Fetch current beacon value (with caching)
    const beaconValue = await getBeaconValue(beaconType);

    // Derive epoch key using HKDF-Expand
    // info = beacon_id || ":" || beacon_value || ":stegochannel-v0"
    return await deriveEpochKey(channelKey, beaconType, beaconValue);
  } catch (error) {
    // Check if we have a stale cached value we can fall back to
    const cached = beaconCache.get(beaconType);
    if (cached) {
      console.warn(
        `Beacon fetch failed for ${beaconType}, using stale cache from ${new Date(cached.timestamp).toISOString()}`
      );
      return await deriveEpochKey(channelKey, beaconType, cached.value);
    }

    throw new Error(`Failed to derive epoch key for ${beaconType}: ${error}`);
  }
}

/**
 * Clear beacon cache (useful for testing or forcing refresh)
 */
export function clearBeaconCache(): void {
  beaconCache.clear();
}

/**
 * Get cache status for debugging
 */
export function getBeaconCacheStatus(): Map<BeaconType, BeaconCacheEntry> {
  return new Map(beaconCache);
}
