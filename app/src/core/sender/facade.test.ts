// Tests for core/sender/index (MessageTransmitter facade + getNextRequiredBits)
// Verifies the public API surface

import { describe, it, expect, vi } from 'vitest';
import { createMockStorage, createDeterministicEpochKey } from '../../test/fixtures';
import type { ChannelConfig } from './types';

// Mock beacon module
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
    const { deriveEpochKey } = await import('../crypto');
    return deriveEpochKey(channelKey, 'date', '2025-01-15');
  }),
}));

import { MessageTransmitter, getNextRequiredBits } from './index';

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

describe('getNextRequiredBits', () => {
  it('returns null when no active transmission', async () => {
    const storage = createMockStorage();
    const transmitter = new MessageTransmitter(storage);
    const config = makeChannelConfig();
    transmitter.registerChannel(config);

    const bits = await getNextRequiredBits(transmitter, 'test-channel');

    expect(bits).toBeNull();
  });

  it('returns correct bits when active transmission exists', async () => {
    const storage = createMockStorage();
    const transmitter = new MessageTransmitter(storage);
    const config = makeChannelConfig();
    transmitter.registerChannel(config);

    // Queue a message to start a transmission
    await transmitter.queueMessage('test-channel', 'test payload');

    const bits = await getNextRequiredBits(transmitter, 'test-channel');

    expect(bits).not.toBeNull();
    expect(Array.isArray(bits)).toBe(true);
    expect(bits!.length).toBeLessThanOrEqual(3);
    expect(bits!.length).toBeGreaterThan(0);

    // All bits should be 0 or 1
    for (const bit of bits!) {
      expect(bit === 0 || bit === 1).toBe(true);
    }
  });

  it('respects maxBits parameter', async () => {
    const storage = createMockStorage();
    const transmitter = new MessageTransmitter(storage);
    const config = makeChannelConfig();
    transmitter.registerChannel(config);

    await transmitter.queueMessage('test-channel', 'test payload');

    const bits1 = await getNextRequiredBits(transmitter, 'test-channel', 1);
    expect(bits1).not.toBeNull();
    expect(bits1!.length).toBeLessThanOrEqual(1);

    const bits2 = await getNextRequiredBits(transmitter, 'test-channel', 2);
    expect(bits2).not.toBeNull();
    expect(bits2!.length).toBeLessThanOrEqual(2);
  });
});

describe('MessageTransmitter.getPendingBits', () => {
  it('returns null when no active transmission', () => {
    const storage = createMockStorage();
    const transmitter = new MessageTransmitter(storage);
    const config = makeChannelConfig();
    transmitter.registerChannel(config);

    const bits = transmitter.getPendingBits('test-channel');

    expect(bits).toBeNull();
  });

  it('returns defensive copy of pending bits', async () => {
    const storage = createMockStorage();
    const transmitter = new MessageTransmitter(storage);
    const config = makeChannelConfig();
    transmitter.registerChannel(config);

    await transmitter.queueMessage('test-channel', 'test');

    const bits1 = transmitter.getPendingBits('test-channel');
    const bits2 = transmitter.getPendingBits('test-channel');

    expect(bits1).not.toBeNull();
    expect(bits2).not.toBeNull();
    expect(bits1).toEqual(bits2);

    // Mutating the returned array should NOT affect internal state
    bits1!.push(999);
    const bits3 = transmitter.getPendingBits('test-channel');
    expect(bits3).not.toContain(999);
  });
});

describe('MessageTransmitter.registerChannel', () => {
  it('throws when accessing unregistered channel', async () => {
    const storage = createMockStorage();
    const transmitter = new MessageTransmitter(storage);

    await expect(
      transmitter.queueMessage('nonexistent', 'msg')
    ).rejects.toThrow('Channel nonexistent not registered');
  });

  it('sets default selectionRate and featureSet', async () => {
    const storage = createMockStorage();
    const transmitter = new MessageTransmitter(storage);
    const key = new Uint8Array(32);
    key[31] = 1;

    // Register without selectionRate/featureSet
    transmitter.registerChannel({
      id: 'bare-channel',
      key,
      beaconType: 'date',
    });

    // Should not throw - defaults should be applied internally
    const status = await transmitter.getStatus('bare-channel');
    expect(status.active).toBe(false);
    expect(status.queueLength).toBe(0);
  });
});

describe('MessageTransmitter.getStatus', () => {
  it('returns inactive status with no transmission', async () => {
    const storage = createMockStorage();
    const transmitter = new MessageTransmitter(storage);
    const config = makeChannelConfig();
    transmitter.registerChannel(config);

    const status = await transmitter.getStatus('test-channel');

    expect(status.active).toBe(false);
    expect(status.queueLength).toBe(0);
    expect(status.progress).toBeUndefined();
  });

  it('returns active status with progress during transmission', async () => {
    const storage = createMockStorage();
    const transmitter = new MessageTransmitter(storage);
    const config = makeChannelConfig();
    transmitter.registerChannel(config);

    await transmitter.queueMessage('test-channel', 'hello world');

    const status = await transmitter.getStatus('test-channel');

    expect(status.active).toBe(true);
    expect(status.progress).toBeDefined();
    expect(status.progress!.bitsSent).toBe(0);
    expect(status.progress!.totalBits).toBeGreaterThan(0);
    expect(status.progress!.percentage).toBe(0);
    expect(status.epochInfo).toBeDefined();
    expect(status.epochInfo!.epochId).toContain('date');
  });
});
