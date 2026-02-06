// Tests for core/sender/state-persistence
// Verifies state load/save with mock storage

import { describe, it, expect } from 'vitest';
import { loadState, persistState } from './state-persistence';
import { createMockStorage } from '../../test/fixtures';
import type { TransmissionState } from './types';

describe('loadState', () => {
  it('returns default state when nothing stored', async () => {
    const storage = createMockStorage();

    const state = await loadState(storage, 'channel-abc');

    expect(state.channelId).toBe('channel-abc');
    expect(state.messageQueue).toEqual([]);
    expect(state.currentTransmission).toBeNull();
    expect(state.messageSequenceNumber).toBe(0);
  });

  it('loads state from storage', async () => {
    const storage = createMockStorage();

    // Pre-populate storage with a state
    const savedState: TransmissionState = {
      channelId: 'channel-xyz',
      messageQueue: [
        { id: 'msg-1', plaintext: 'hello', queuedAt: 1000, priority: 'normal' },
      ],
      currentTransmission: null,
      messageSequenceNumber: 5,
    };
    await storage.saveState('transmission:channel-xyz', savedState);

    const loaded = await loadState(storage, 'channel-xyz');

    expect(loaded.channelId).toBe('channel-xyz');
    expect(loaded.messageQueue).toHaveLength(1);
    expect(loaded.messageQueue[0].plaintext).toBe('hello');
    expect(loaded.messageSequenceNumber).toBe(5);
  });

  it('returns different default states for different channels', async () => {
    const storage = createMockStorage();

    const state1 = await loadState(storage, 'channel-1');
    const state2 = await loadState(storage, 'channel-2');

    expect(state1.channelId).toBe('channel-1');
    expect(state2.channelId).toBe('channel-2');
  });
});

describe('persistState', () => {
  it('persists state changes', async () => {
    const storage = createMockStorage();

    const state: TransmissionState = {
      channelId: 'channel-persist',
      messageQueue: [
        { id: 'msg-a', plaintext: 'world', queuedAt: 2000, priority: 'high' },
      ],
      currentTransmission: null,
      messageSequenceNumber: 3,
    };

    await persistState(storage, state);

    // Verify it was saved by loading it back
    const loaded = await loadState(storage, 'channel-persist');
    expect(loaded.channelId).toBe('channel-persist');
    expect(loaded.messageQueue).toHaveLength(1);
    expect(loaded.messageQueue[0].id).toBe('msg-a');
    expect(loaded.messageSequenceNumber).toBe(3);
  });

  it('overwrites previously persisted state', async () => {
    const storage = createMockStorage();

    const state1: TransmissionState = {
      channelId: 'channel-ow',
      messageQueue: [],
      currentTransmission: null,
      messageSequenceNumber: 1,
    };
    await persistState(storage, state1);

    const state2: TransmissionState = {
      channelId: 'channel-ow',
      messageQueue: [{ id: 'new-msg', plaintext: 'updated', queuedAt: 3000, priority: 'normal' }],
      currentTransmission: null,
      messageSequenceNumber: 10,
    };
    await persistState(storage, state2);

    const loaded = await loadState(storage, 'channel-ow');
    expect(loaded.messageSequenceNumber).toBe(10);
    expect(loaded.messageQueue).toHaveLength(1);
    expect(loaded.messageQueue[0].plaintext).toBe('updated');
  });

  it('persists state with active transmission', async () => {
    const storage = createMockStorage();

    const state: TransmissionState = {
      channelId: 'channel-tx',
      messageQueue: [],
      currentTransmission: {
        messageId: 'msg-tx',
        plaintext: 'test message',
        encodedFrame: new Uint8Array([1, 2, 3]),
        totalBits: 24,
        bitPosition: 8,
        pendingBits: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
        epochKey: new Uint8Array(32),
        epochId: 'date:2025-01-15',
        epochExpiresAt: Date.now() + 86400_000,
        signalPostsUsed: ['post-1'],
        startedAt: Date.now(),
        lastActivityAt: Date.now(),
      },
      messageSequenceNumber: 2,
    };

    await persistState(storage, state);

    const loaded = await loadState(storage, 'channel-tx');
    expect(loaded.currentTransmission).not.toBeNull();
    expect(loaded.currentTransmission!.messageId).toBe('msg-tx');
    expect(loaded.currentTransmission!.bitPosition).toBe(8);
    expect(loaded.currentTransmission!.signalPostsUsed).toEqual(['post-1']);
  });
});
