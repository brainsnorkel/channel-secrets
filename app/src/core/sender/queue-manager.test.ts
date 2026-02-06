// Tests for core/sender/queue-manager
// Verifies message queuing, cancellation, and transmission lifecycle

import { describe, it, expect, vi } from 'vitest';
import { createMockStorage } from '../../test/fixtures';
import type { TransmissionState, ChannelConfig } from './types';

// Mock beacon module for startNextTransmission (which calls getEpochKey -> beacon)
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

import { queueMessage, cancelTransmission, startNextTransmission, completeTransmission } from './queue-manager';

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

describe('queueMessage', () => {
  it('adds normal-priority message to end of queue', async () => {
    const storage = createMockStorage();
    const state = makeEmptyState();

    const id = await queueMessage(state, 'first message', 'normal', storage);

    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
    expect(state.messageQueue).toHaveLength(1);
    expect(state.messageQueue[0].plaintext).toBe('first message');
    expect(state.messageQueue[0].priority).toBe('normal');
  });

  it('adds high-priority message to front of queue', async () => {
    const storage = createMockStorage();
    const state = makeEmptyState();

    await queueMessage(state, 'normal msg', 'normal', storage);
    await queueMessage(state, 'urgent msg', 'high', storage);

    expect(state.messageQueue).toHaveLength(2);
    expect(state.messageQueue[0].plaintext).toBe('urgent msg');
    expect(state.messageQueue[0].priority).toBe('high');
    expect(state.messageQueue[1].plaintext).toBe('normal msg');
  });

  it('persists state after queuing', async () => {
    const storage = createMockStorage();
    const state = makeEmptyState();

    await queueMessage(state, 'persisted msg', 'normal', storage);

    // Verify storage was written to
    const stored = await storage.getState<TransmissionState>('transmission:test-channel');
    expect(stored).not.toBeNull();
    expect(stored!.messageQueue).toHaveLength(1);
  });

  it('assigns unique IDs to each message', async () => {
    const storage = createMockStorage();
    const state = makeEmptyState();

    const id1 = await queueMessage(state, 'msg1', 'normal', storage);
    const id2 = await queueMessage(state, 'msg2', 'normal', storage);

    expect(id1).not.toBe(id2);
  });
});

describe('cancelTransmission', () => {
  it('clears current transmission', async () => {
    const storage = createMockStorage();
    const state: TransmissionState = {
      channelId: 'test-channel',
      messageQueue: [{ id: 'msg-1', plaintext: 'hello', queuedAt: 1000, priority: 'normal' }],
      currentTransmission: {
        messageId: 'msg-1',
        plaintext: 'hello',
        encodedFrame: new Uint8Array([0]),
        totalBits: 10,
        bitPosition: 3,
        pendingBits: [1, 0, 1, 0, 1, 0, 1],
        epochKey: new Uint8Array(32),
        epochId: 'date:2025-01-15',
        epochExpiresAt: Date.now() + 86400_000,
        signalPostsUsed: [],
        startedAt: Date.now(),
        lastActivityAt: Date.now(),
      },
      messageSequenceNumber: 1,
    };

    await cancelTransmission(state, storage);

    expect(state.currentTransmission).toBeNull();
  });

  it('does nothing when no active transmission', async () => {
    const storage = createMockStorage();
    const state = makeEmptyState();

    // Should not throw
    await cancelTransmission(state, storage);
    expect(state.currentTransmission).toBeNull();
  });

  it('moves current message back to front of queue when found', async () => {
    const storage = createMockStorage();
    const msg = { id: 'msg-requeue', plaintext: 'requeue me', queuedAt: 1000, priority: 'normal' as const };
    const state: TransmissionState = {
      channelId: 'test-channel',
      messageQueue: [msg],
      currentTransmission: {
        messageId: 'msg-requeue',
        plaintext: 'requeue me',
        encodedFrame: new Uint8Array([0]),
        totalBits: 10,
        bitPosition: 0,
        pendingBits: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
        epochKey: new Uint8Array(32),
        epochId: 'date:2025-01-15',
        epochExpiresAt: Date.now() + 86400_000,
        signalPostsUsed: [],
        startedAt: Date.now(),
        lastActivityAt: Date.now(),
      },
      messageSequenceNumber: 1,
    };

    await cancelTransmission(state, storage);

    expect(state.currentTransmission).toBeNull();
    // The message should be at the front of the queue
    expect(state.messageQueue[0].id).toBe('msg-requeue');
  });
});

describe('startNextTransmission', () => {
  it('dequeues and creates transmission state', async () => {
    const storage = createMockStorage();
    const channel = makeChannelConfig();
    const state = makeEmptyState();

    // Queue a message first
    await queueMessage(state, 'transmit me', 'normal', storage);
    expect(state.messageQueue).toHaveLength(1);

    await startNextTransmission(state, channel, storage);

    expect(state.currentTransmission).not.toBeNull();
    expect(state.currentTransmission!.totalBits).toBeGreaterThan(0);
    expect(state.currentTransmission!.bitPosition).toBe(0);
    expect(state.currentTransmission!.pendingBits.length).toBe(state.currentTransmission!.totalBits);
    expect(state.messageQueue).toHaveLength(0); // Dequeued
    expect(state.messageSequenceNumber).toBe(1); // Incremented
  });

  it('does nothing when queue is empty', async () => {
    const storage = createMockStorage();
    const channel = makeChannelConfig();
    const state = makeEmptyState();

    await startNextTransmission(state, channel, storage);

    expect(state.currentTransmission).toBeNull();
    expect(state.messageSequenceNumber).toBe(0);
  });
});

describe('completeTransmission', () => {
  it('clears current transmission', async () => {
    const storage = createMockStorage();
    const channel = makeChannelConfig();
    const state = makeEmptyState();

    // Queue and start a transmission
    await queueMessage(state, 'complete me', 'normal', storage);
    await startNextTransmission(state, channel, storage);
    expect(state.currentTransmission).not.toBeNull();

    await completeTransmission(state, channel, storage);

    expect(state.currentTransmission).toBeNull();
  });

  it('starts next transmission if queue is not empty', async () => {
    const storage = createMockStorage();
    const channel = makeChannelConfig();
    const state = makeEmptyState();

    // Queue two messages
    await queueMessage(state, 'first', 'normal', storage);
    await queueMessage(state, 'second', 'normal', storage);

    // Start first transmission
    await startNextTransmission(state, channel, storage);
    expect(state.messageQueue).toHaveLength(1); // 'second' remains

    // Complete first -- should auto-start second
    await completeTransmission(state, channel, storage);

    expect(state.currentTransmission).not.toBeNull();
    expect(state.messageQueue).toHaveLength(0); // 'second' dequeued
  });

  it('does nothing when no active transmission', async () => {
    const storage = createMockStorage();
    const channel = makeChannelConfig();
    const state = makeEmptyState();

    await completeTransmission(state, channel, storage);

    expect(state.currentTransmission).toBeNull();
  });
});
