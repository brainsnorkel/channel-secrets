// Module: core/sender/epoch-manager
// Epoch key management for StegoChannel sender pipeline (SPEC.md Section 5)

import { deriveEpochKeyForBeacon, getBeaconValue } from '../beacon';
import type { BeaconType } from '../beacon';
import type { ChannelConfig, TransmissionState } from './types';

/**
 * Get or derive epoch key for the current beacon.
 * Returns cached epoch key from active transmission if still valid,
 * otherwise derives a new one.
 *
 * @param channel - Channel configuration with key and beacon type
 * @param state - Current transmission state (may contain cached epoch key)
 * @returns Epoch key, epoch identifier, and expiration timestamp
 */
export async function getEpochKey(
  channel: ChannelConfig,
  state: TransmissionState
): Promise<{ epochKey: Uint8Array; epochId: string; epochExpiresAt: number }> {
  const now = Date.now();

  // Check if current epoch is still valid
  if (state.currentTransmission) {
    const transmission = state.currentTransmission;
    if (now < transmission.epochExpiresAt) {
      return {
        epochKey: transmission.epochKey,
        epochId: transmission.epochId,
        epochExpiresAt: transmission.epochExpiresAt,
      };
    }
  }

  // Derive new epoch key
  const beaconValue = await getBeaconValue(channel.beaconType);
  const epochKey = await deriveEpochKeyForBeacon(channel.key, channel.beaconType);
  const epochId = `${channel.beaconType}:${beaconValue}`;

  // Calculate epoch expiration
  const epochDuration = getEpochDuration(channel.beaconType);
  const epochExpiresAt = now + epochDuration;

  return { epochKey, epochId, epochExpiresAt };
}

/**
 * Get epoch duration in milliseconds for a beacon type.
 *
 * @param beaconType - Beacon type
 * @returns Duration in milliseconds
 */
export function getEpochDuration(beaconType: BeaconType): number {
  switch (beaconType) {
    case 'btc':
      return 600_000; // 10 minutes
    case 'nist':
      return 60_000; // 1 minute
    case 'date':
      return 86400_000; // 24 hours
  }
}
