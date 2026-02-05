// Module: state/state.test
// Comprehensive tests for domain-isolated state management

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { initSodium } from '../core/crypto';
import type { Channel, Message, TransmissionState } from '../schemas';
import {
  initState,
  subscribe,
  getState,
  getDomainState,
  unlock,
  lock,
  isUnlocked,
  setChannel,
  getChannel,
  deleteChannel,
  setActiveChannel,
  getActiveChannelId,
  addMessage,
  getMessages,
  setTransmissionState,
  getTransmissionState,
  clearTransmissionState,
  setView,
  getUI,
  setError,
  clearError,
  exportState,
  importState,
} from './index';
import { updateDomain } from './updates';
import { assertUnlocked, assertActiveChannel, assertNoActiveTx } from './guards';
import { cacheKey, removeCachedKey } from './security';
import type { DomainState } from './domains';

// Initialize sodium before all tests
beforeAll(async () => {
  await initSodium();
});

// Reset state before each test
beforeEach(() => {
  initState();
});

// Helper to create a valid test channel
function createTestChannel(id: string): Channel {
  return {
    id,
    name: 'Test Channel',
    key: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', // 43 chars base64url
    beaconType: 'date',
    selectionRate: 0.25,
    featureSet: 'v0',
    mySources: [],
    theirSources: [],
    createdAt: Date.now(),
  };
}

// Helper to create a valid test message
function createTestMessage(channelId: string): Message {
  return {
    id: '550e8400-e29b-41d4-a716-446655440000',
    channelId,
    content: 'Test message',
    timestamp: Date.now(),
    direction: 'sent',
    verified: false,
  };
}

// Helper to create test transmission state
function createTestTransmission(channelId: string): TransmissionState {
  return {
    messageId: '550e8400-e29b-41d4-a716-446655440001',
    channelId,
    totalBits: 100,
    transmittedBits: 0,
    draftBuffer: [],
    sourcesUsed: {},
    status: 'pending',
  };
}

describe('Immutability', () => {
  it('original state unchanged after update', () => {
    const initialState: DomainState = {
      sender: { transmissions: {} },
      receiver: { messages: {}, lastPollTime: {} },
      channel: { channels: {}, activeChannelId: null },
      security: { unlocked: false, _keyCache: new Map() },
      ui: { view: 'feed', loading: false, error: null },
    };

    const originalChannels = initialState.channel.channels;

    const newState = updateDomain(initialState, 'channel', (current) => ({
      ...current,
      channels: { ...current.channels, 'test-id': createTestChannel('test-id') },
    }));

    // Original should be unchanged
    expect(Object.keys(originalChannels)).toHaveLength(0);
    expect(initialState.channel.channels).toBe(originalChannels);

    // New state should have the channel
    expect(Object.keys(newState.channel.channels)).toHaveLength(1);
    expect(newState.channel.channels['test-id']).toBeDefined();
  });
});

describe('Domain isolation', () => {
  it('updating sender does not affect channel', () => {
    unlock();
    const channelId = '550e8400-e29b-41d4-a716-446655440002';
    const channel = createTestChannel(channelId);
    setChannel(channelId, channel);

    const stateBefore = getDomainState();
    const channelsBefore = stateBefore.channel.channels;

    // Update sender domain
    setTransmissionState(channelId, createTestTransmission(channelId));

    const stateAfter = getDomainState();

    // Channel reference should be unchanged (same object)
    expect(stateAfter.channel.channels).toEqual(channelsBefore);
  });

  it('updating ui does not affect receiver', () => {
    const stateBefore = getDomainState();
    const messagesBefore = stateBefore.receiver.messages;

    setView('compose');

    const stateAfter = getDomainState();
    expect(stateAfter.receiver.messages).toBe(messagesBefore);
  });
});

describe('Guards', () => {
  it('setChannel throws when locked', () => {
    expect(isUnlocked()).toBe(false);
    expect(() => {
      setChannel('test-id', createTestChannel('test-id'));
    }).toThrow('State guard: app is locked');
  });

  it('setTransmissionState throws when locked', () => {
    expect(isUnlocked()).toBe(false);
    expect(() => {
      setTransmissionState('test-id', createTestTransmission('test-id'));
    }).toThrow('State guard: app is locked');
  });

  it('addMessage throws when locked', () => {
    expect(isUnlocked()).toBe(false);
    expect(() => {
      addMessage('test-id', createTestMessage('test-id'));
    }).toThrow('State guard: app is locked');
  });

  it('assertUnlocked passes when unlocked', () => {
    unlock();
    const state = getDomainState();
    expect(() => assertUnlocked(state)).not.toThrow();
  });

  it('assertActiveChannel throws when no active channel', () => {
    const state = getDomainState();
    expect(() => assertActiveChannel(state)).toThrow('State guard: no active channel');
  });

  it('assertActiveChannel passes when channel is active', () => {
    unlock();
    const channelId = '550e8400-e29b-41d4-a716-446655440003';
    setChannel(channelId, createTestChannel(channelId));
    setActiveChannel(channelId);

    const state = getDomainState();
    expect(() => assertActiveChannel(state)).not.toThrow();
  });

  it('assertNoActiveTx throws when transmission is pending', () => {
    unlock();
    const channelId = '550e8400-e29b-41d4-a716-446655440004';
    setChannel(channelId, createTestChannel(channelId));
    setTransmissionState(channelId, createTestTransmission(channelId));

    const state = getDomainState();
    expect(() => assertNoActiveTx(state, channelId)).toThrow(
      `State guard: active transmission exists for channel ${channelId}`
    );
  });

  it('assertNoActiveTx passes when no transmission exists', () => {
    const state = getDomainState();
    expect(() => assertNoActiveTx(state, 'nonexistent')).not.toThrow();
  });
});

describe('Memory zeroing', () => {
  it('lock() zeros all cached Uint8Array keys', () => {
    unlock();

    // Get key cache and add test keys
    const state = getDomainState();
    const key1 = new Uint8Array([1, 2, 3, 4, 5]);
    const key2 = new Uint8Array([6, 7, 8, 9, 10]);

    cacheKey(state.security._keyCache, 'channel1', key1);
    cacheKey(state.security._keyCache, 'channel2', key2);

    expect(state.security._keyCache.size).toBe(2);

    // Lock should zero keys
    lock();

    // Keys should be zeroed (all zeros)
    expect(key1.every((b) => b === 0)).toBe(true);
    expect(key2.every((b) => b === 0)).toBe(true);

    // Cache should be cleared
    const stateAfterLock = getDomainState();
    expect(stateAfterLock.security._keyCache.size).toBe(0);
    expect(stateAfterLock.security.unlocked).toBe(false);
  });

  it('removeCachedKey zeros specific key', () => {
    const keyCache = new Map<string, Uint8Array>();
    const key1 = new Uint8Array([1, 2, 3]);
    const key2 = new Uint8Array([4, 5, 6]);

    cacheKey(keyCache, 'channel1', key1);
    cacheKey(keyCache, 'channel2', key2);

    removeCachedKey(keyCache, 'channel1');

    // key1 should be zeroed
    expect(key1.every((b) => b === 0)).toBe(true);
    // key2 should be unchanged
    expect(key2).toEqual(new Uint8Array([4, 5, 6]));
    // Cache should only have channel2
    expect(keyCache.size).toBe(1);
    expect(keyCache.has('channel1')).toBe(false);
    expect(keyCache.has('channel2')).toBe(true);
  });
});

describe('getDomainState', () => {
  it('returns domain state structure', () => {
    const state = getDomainState();

    expect(state).toHaveProperty('sender');
    expect(state).toHaveProperty('receiver');
    expect(state).toHaveProperty('channel');
    expect(state).toHaveProperty('security');
    expect(state).toHaveProperty('ui');

    expect(state.sender).toHaveProperty('transmissions');
    expect(state.receiver).toHaveProperty('messages');
    expect(state.receiver).toHaveProperty('lastPollTime');
    expect(state.channel).toHaveProperty('channels');
    expect(state.channel).toHaveProperty('activeChannelId');
    expect(state.security).toHaveProperty('unlocked');
    expect(state.security).toHaveProperty('_keyCache');
  });
});

describe('getState (backward compat)', () => {
  it('returns AppState shape', () => {
    const state = getState();

    expect(state).toHaveProperty('unlocked');
    expect(state).toHaveProperty('activeChannelId');
    expect(state).toHaveProperty('channels');
    expect(state).toHaveProperty('messages');
    expect(state).toHaveProperty('transmissionState');
    expect(state).toHaveProperty('ui');

    expect(typeof state.unlocked).toBe('boolean');
    expect(state.activeChannelId).toBeNull();
    expect(state.channels).toEqual({});
    expect(state.messages).toEqual({});
    expect(state.transmissionState).toEqual({});
  });

  it('maps domain state to AppState correctly', () => {
    unlock();
    const channelId = '550e8400-e29b-41d4-a716-446655440005';
    const channel = createTestChannel(channelId);
    setChannel(channelId, channel);
    setActiveChannel(channelId);
    addMessage(channelId, createTestMessage(channelId));
    setTransmissionState(channelId, createTestTransmission(channelId));

    const appState = getState();

    expect(appState.unlocked).toBe(true);
    expect(appState.activeChannelId).toBe(channelId);
    expect(appState.channels[channelId]).toEqual(channel);
    expect(appState.messages[channelId]).toHaveLength(1);
    expect(appState.transmissionState[channelId]).toBeDefined();
  });
});

describe('subscribe and notify', () => {
  it('subscribe returns unsubscribe function', () => {
    let callCount = 0;
    const listener = () => {
      callCount++;
    };

    const unsubscribe = subscribe(listener);
    expect(typeof unsubscribe).toBe('function');

    // Trigger a state change
    unlock();
    expect(callCount).toBe(1);

    // Unsubscribe and trigger again
    unsubscribe();
    lock();
    expect(callCount).toBe(1); // Should not have been called again
  });

  it('notifies all subscribers on state change', () => {
    let count1 = 0;
    let count2 = 0;

    subscribe(() => count1++);
    subscribe(() => count2++);

    unlock();

    expect(count1).toBe(1);
    expect(count2).toBe(1);
  });
});

describe('deleteChannel', () => {
  it('cleans up messages and transmission state', () => {
    unlock();
    const channelId = '550e8400-e29b-41d4-a716-446655440006';
    const channel = createTestChannel(channelId);

    // Set up channel with messages and transmission
    setChannel(channelId, channel);
    addMessage(channelId, createTestMessage(channelId));
    setTransmissionState(channelId, createTestTransmission(channelId));
    setActiveChannel(channelId);

    // Verify setup
    expect(getChannel(channelId)).toBeDefined();
    expect(getMessages(channelId)).toHaveLength(1);
    expect(getTransmissionState(channelId)).toBeDefined();
    expect(getActiveChannelId()).toBe(channelId);

    // Delete
    deleteChannel(channelId);

    // Verify cleanup
    expect(getChannel(channelId)).toBeUndefined();
    expect(getMessages(channelId)).toHaveLength(0);
    expect(getTransmissionState(channelId)).toBeUndefined();
    expect(getActiveChannelId()).toBeNull();
  });

  it('throws when locked', () => {
    expect(() => {
      deleteChannel('test-id');
    }).toThrow('State guard: app is locked');
  });
});

describe('unlock and lock', () => {
  it('unlock sets unlocked to true', () => {
    expect(isUnlocked()).toBe(false);
    unlock();
    expect(isUnlocked()).toBe(true);
  });

  it('lock sets unlocked to false and clears sensitive state', () => {
    unlock();
    const channelId = '550e8400-e29b-41d4-a716-446655440007';
    setChannel(channelId, createTestChannel(channelId));
    addMessage(channelId, createTestMessage(channelId));
    setTransmissionState(channelId, createTestTransmission(channelId));

    expect(isUnlocked()).toBe(true);
    expect(getMessages(channelId)).toHaveLength(1);
    expect(getTransmissionState(channelId)).toBeDefined();

    lock();

    expect(isUnlocked()).toBe(false);
    // Sender and receiver state should be cleared
    expect(getDomainState().sender.transmissions).toEqual({});
    expect(getDomainState().receiver.messages).toEqual({});
    // But channels remain (they're not sensitive in the same way)
  });
});

describe('UI operations', () => {
  it('setView updates view', () => {
    expect(getUI().view).toBe('feed');
    setView('compose');
    expect(getUI().view).toBe('compose');
  });

  it('setError and clearError work correctly', () => {
    expect(getUI().error).toBeNull();
    setError('Test error');
    expect(getUI().error).toBe('Test error');
    clearError();
    expect(getUI().error).toBeNull();
  });
});

describe('Transmission operations', () => {
  it('clearTransmissionState removes transmission', () => {
    unlock();
    const channelId = '550e8400-e29b-41d4-a716-446655440008';
    setChannel(channelId, createTestChannel(channelId));
    setTransmissionState(channelId, createTestTransmission(channelId));

    expect(getTransmissionState(channelId)).toBeDefined();

    clearTransmissionState(channelId);

    expect(getTransmissionState(channelId)).toBeUndefined();
  });
});

describe('Export and import', () => {
  it('exportState returns deep copy', () => {
    unlock();
    const channelId = '550e8400-e29b-41d4-a716-446655440009';
    setChannel(channelId, createTestChannel(channelId));

    const exported = exportState();

    // Modify exported state
    exported.channels[channelId].name = 'Modified';

    // Original should be unchanged
    expect(getChannel(channelId)?.name).toBe('Test Channel');
  });

  it('importState restores state', () => {
    const channelId = '550e8400-e29b-41d4-a716-446655440010';
    const importData = {
      unlocked: true,
      activeChannelId: channelId,
      channels: { [channelId]: createTestChannel(channelId) },
      messages: { [channelId]: [createTestMessage(channelId)] },
      transmissionState: { [channelId]: createTestTransmission(channelId) },
      ui: { view: 'settings' as const, loading: true, error: 'test' },
    };

    importState(importData);

    expect(isUnlocked()).toBe(true);
    expect(getActiveChannelId()).toBe(channelId);
    expect(getChannel(channelId)).toBeDefined();
    expect(getMessages(channelId)).toHaveLength(1);
    expect(getTransmissionState(channelId)).toBeDefined();
    expect(getUI().view).toBe('settings');
    expect(getUI().loading).toBe(true);
    expect(getUI().error).toBe('test');
  });
});
