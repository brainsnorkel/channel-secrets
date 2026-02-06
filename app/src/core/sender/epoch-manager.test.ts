// Tests for core/sender/epoch-manager
// Verifies epoch key retrieval and caching

import { describe, it, expect, vi } from 'vitest';
import type { TransmissionState, ChannelConfig } from './types';

// Mock the beacon module before importing epoch-manager
vi.mock('../beacon', () => ({
  getBeaconValue: vi.fn().mockResolvedValue('2025-01-15'),
  getEpochInfo: vi.fn().mockReturnValue({
    beaconType: 'date',
    epochDuration: 86400_000,
    epochsToCheck: 1,
  }),
  getBeaconHistory: vi.fn().mockReturnValue(['2025-01-15']),
  formatDateBeacon: vi.fn().mockImplementation((date: Date) => {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  }),
  clearBeaconCache: vi.fn(),
  clearBeaconHistory: vi.fn(),
  deriveEpochKeyForBeacon: vi.fn().mockImplementation(async (channelKey: Uint8Array, _beaconType: string) => {
    // Return a deterministic 32-byte key based on channel key
    const { deriveEpochKey } = await import('../crypto');
    return deriveEpochKey(channelKey, 'date', '2025-01-15');
  }),
}));

// Import after mock setup
import { getEpochKey, getEpochDuration } from './epoch-manager';

function makeChannelConfig(): ChannelConfig {
  const key = new Uint8Array(32);
  key[31] = 1;
  return {
    id: 'test-channel',
    key,
    beaconType: 'date',
    selectionRate: 0.25,
    featureSet: ['len', 'media', 'qmark'],
  };
}

function makeEmptyState(): TransmissionState {
  return {
    channelId: 'test-channel',
    messageQueue: [],
    currentTransmission: null,
    messageSequenceNumber: 0,
  };
}

describe('getEpochKey', () => {
  it('returns epoch key for a channel', async () => {
    const channel = makeChannelConfig();
    const state = makeEmptyState();

    const result = await getEpochKey(channel, state);

    expect(result.epochKey).toBeInstanceOf(Uint8Array);
    expect(result.epochKey.length).toBe(32);
    expect(result.epochId).toContain('date');
    expect(result.epochExpiresAt).toBeGreaterThan(Date.now());
  });

  it('caches epoch key when not expired', async () => {
    const channel = makeChannelConfig();
    const cachedKey = new Uint8Array(32);
    cachedKey[0] = 0xAA;

    const state: TransmissionState = {
      channelId: 'test-channel',
      messageQueue: [],
      currentTransmission: {
        messageId: 'msg-1',
        plaintext: 'test',
        encodedFrame: new Uint8Array([0]),
        totalBits: 10,
        bitPosition: 0,
        pendingBits: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
        epochKey: cachedKey,
        epochId: 'date:2025-01-15',
        epochExpiresAt: Date.now() + 86400_000, // Not expired
        signalPostsUsed: [],
        startedAt: Date.now(),
        lastActivityAt: Date.now(),
      },
      messageSequenceNumber: 1,
    };

    const result = await getEpochKey(channel, state);

    // Should return the cached key, not derive a new one
    expect(result.epochKey).toBe(cachedKey);
    expect(result.epochKey[0]).toBe(0xAA);
    expect(result.epochId).toBe('date:2025-01-15');
  });

  it('derives new epoch key when cached one is expired', async () => {
    const channel = makeChannelConfig();
    const expiredKey = new Uint8Array(32);
    expiredKey[0] = 0xBB;

    const state: TransmissionState = {
      channelId: 'test-channel',
      messageQueue: [],
      currentTransmission: {
        messageId: 'msg-1',
        plaintext: 'test',
        encodedFrame: new Uint8Array([0]),
        totalBits: 10,
        bitPosition: 0,
        pendingBits: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
        epochKey: expiredKey,
        epochId: 'date:2025-01-14',
        epochExpiresAt: Date.now() - 1000, // Expired
        signalPostsUsed: [],
        startedAt: Date.now(),
        lastActivityAt: Date.now(),
      },
      messageSequenceNumber: 1,
    };

    const result = await getEpochKey(channel, state);

    // Should derive a new key, not return the expired one
    expect(result.epochKey).not.toBe(expiredKey);
    expect(result.epochKey.length).toBe(32);
    expect(result.epochId).toContain('date:2025-01-15');
  });
});

describe('getEpochDuration', () => {
  it('returns 10 minutes for btc', () => {
    expect(getEpochDuration('btc')).toBe(600_000);
  });

  it('returns 1 minute for nist', () => {
    expect(getEpochDuration('nist')).toBe(60_000);
  });

  it('returns 24 hours for date', () => {
    expect(getEpochDuration('date')).toBe(86400_000);
  });
});
