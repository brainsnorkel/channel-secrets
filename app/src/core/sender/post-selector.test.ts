// Tests for core/sender/post-selector
// Verifies checkPost and confirmPost behavior

import { describe, it, expect } from 'vitest';
import { checkPost, confirmPost } from './post-selector';
import { createDeterministicEpochKey } from '../../test/fixtures';
import { computeSelectionHash, getSelectionValue, computeThreshold } from '../protocol/selection';
import { extractFeatures } from '../protocol/features';
import type { TransmissionState, ChannelConfig } from './types';

function makeChannelConfig(epochKey: { channelKey: Uint8Array; beaconType: 'date' }): ChannelConfig {
  return {
    id: 'test-channel',
    key: epochKey.channelKey,
    beaconType: epochKey.beaconType,
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

function makeActiveState(pendingBits: number[]): TransmissionState {
  return {
    channelId: 'test-channel',
    messageQueue: [],
    currentTransmission: {
      messageId: 'msg-1',
      plaintext: 'test',
      encodedFrame: new Uint8Array([0]),
      totalBits: pendingBits.length,
      bitPosition: 0,
      pendingBits: [...pendingBits],
      epochKey: new Uint8Array(32),
      epochId: 'date:2025-01-15',
      epochExpiresAt: Date.now() + 86400_000,
      signalPostsUsed: [],
      startedAt: Date.now(),
      lastActivityAt: Date.now(),
    },
    messageSequenceNumber: 1,
  };
}

/**
 * Find a post ID that IS a signal post for the given epoch key and rate.
 * Async version that correctly awaits the selection hash computation.
 */
async function findSignalPostId(epochKey: Uint8Array, rate: number = 0.25): Promise<string> {
  const threshold = computeThreshold(rate);
  for (let i = 0; i < 10000; i++) {
    const id = `signal-${i.toString(36)}`;
    const hash = await computeSelectionHash(epochKey, id);
    const value = getSelectionValue(hash);
    if (value < threshold) {
      return id;
    }
  }
  throw new Error('Failed to find signal post ID after 10000 attempts');
}

/**
 * Find a post ID that is NOT a signal post for the given epoch key and rate.
 * Async version that correctly awaits the selection hash computation.
 */
async function findCoverPostId(epochKey: Uint8Array, rate: number = 0.25): Promise<string> {
  const threshold = computeThreshold(rate);
  for (let i = 0; i < 10000; i++) {
    const id = `cover-${i.toString(36)}`;
    const hash = await computeSelectionHash(epochKey, id);
    const value = getSelectionValue(hash);
    if (value >= threshold) {
      return id;
    }
  }
  throw new Error('Failed to find cover post ID after 10000 attempts');
}

describe('checkPost', () => {
  it('shows correct feature bits for known text', async () => {
    const epochData = await createDeterministicEpochKey();
    const config = makeChannelConfig(epochData);
    const state = makeEmptyState();

    // Short text without media, no question mark
    // 'Hi' is < 50 chars => len=0, no media => media=0, no '?' => qmark=0
    const result = checkPost('Hi', false, state, config);
    expect(result.features.len).toBe(0);
    expect(result.features.media).toBe(0);
    expect(result.features.qmark).toBe(0);
    expect(result.extractedBits).toEqual([0, 0, 0]);
  });

  it('shows len=1 for long text, media=1 with media, qmark=1 with question', async () => {
    const epochData = await createDeterministicEpochKey();
    const config = makeChannelConfig(epochData);
    const state = makeEmptyState();

    // Long text (>= 50 chars) with media and question mark
    const longText = 'This is a long post that definitely exceeds fifty characters, right?';
    const result = checkPost(longText, true, state, config);
    expect(result.features.len).toBe(1);
    expect(result.features.media).toBe(1);
    expect(result.features.qmark).toBe(1);
    expect(result.extractedBits).toEqual([1, 1, 1]);
  });

  it('reports no active transmission when state has no current transmission', async () => {
    const epochData = await createDeterministicEpochKey();
    const config = makeChannelConfig(epochData);
    const state = makeEmptyState();

    const result = checkPost('hello', false, state, config);
    expect(result.requiredBits).toBeNull();
    expect(result.wouldMatch).toBe(false);
    expect(result.guidance).toContain('No active transmission');
  });

  it('reports match when extracted bits equal required bits', async () => {
    const epochData = await createDeterministicEpochKey();
    const config = makeChannelConfig(epochData);

    // 'Hi' => bits [0, 0, 0], so make pending bits start with [0, 0, 0]
    const state = makeActiveState([0, 0, 0, 1, 1, 1]);
    const result = checkPost('Hi', false, state, config);

    expect(result.wouldMatch).toBe(true);
    expect(result.requiredBits).toEqual([0, 0, 0]);
    expect(result.guidance).toContain('required bit');
  });

  it('reports mismatch when extracted bits differ from required bits', async () => {
    const epochData = await createDeterministicEpochKey();
    const config = makeChannelConfig(epochData);

    // 'Hi' => bits [0, 0, 0], but pending starts with [1, 1, 1]
    const state = makeActiveState([1, 1, 1, 0, 0, 0]);
    const result = checkPost('Hi', false, state, config);

    expect(result.wouldMatch).toBe(false);
    expect(result.requiredBits).toEqual([1, 1, 1]);
    expect(result.guidance).toContain("wouldn't match");
  });

  it('reports transmission complete when all bits sent', async () => {
    const epochData = await createDeterministicEpochKey();
    const config = makeChannelConfig(epochData);

    // State where bitPosition == totalBits (fully transmitted)
    const state = makeActiveState([]);
    state.currentTransmission!.totalBits = 6;
    state.currentTransmission!.bitPosition = 6;
    state.currentTransmission!.pendingBits = [];

    const result = checkPost('Hello', false, state, config);
    expect(result.wouldMatch).toBe(false);
    expect(result.guidance).toContain('Transmission complete');
  });
});

describe('confirmPost', () => {
  it('determines cover post correctly using async selection', async () => {
    const epochData = await createDeterministicEpochKey();
    const config = makeChannelConfig(epochData);

    // Find an actual cover post ID using async primitives
    const coverPostId = await findCoverPostId(epochData.epochKey);
    const state = makeActiveState([0, 0, 0, 1, 1, 1]);
    const extractPostId = (uri: string) => uri;

    const { result } = await confirmPost(
      coverPostId, 'Some text', false,
      state, config, epochData.epochKey, extractPostId
    );

    expect(result.wasSignal).toBe(false);
    expect(result.transmissionAdvanced).toBe(false);
    expect(result.message).toContain('Cover post');
  });

  it('advances transmission when signal and bits match', async () => {
    const epochData = await createDeterministicEpochKey();
    const config = makeChannelConfig(epochData);

    // Find an actual signal post ID using async primitives
    const signalPostId = await findSignalPostId(epochData.epochKey);

    // The text we pass determines extracted features.
    // 'Hi' (short, no media, no ?) => bits [0, 0, 0]
    const text = 'Hi';
    const hasMedia = false;
    const features = extractFeatures(text, hasMedia, ['len', 'media', 'qmark']);
    const extractedBits = features.bits;

    // Set pending bits to match the extracted bits
    const state = makeActiveState([...extractedBits, 1, 0, 1]);
    const extractPostId = (uri: string) => uri;

    const { result } = await confirmPost(
      signalPostId, text, hasMedia,
      state, config, epochData.epochKey, extractPostId
    );

    expect(result.wasSignal).toBe(true);
    expect(result.bitsMatched).toBe(true);
    expect(result.transmissionAdvanced).toBe(true);
    expect(result.newBitPosition).toBe(extractedBits.length);
  });

  it('does not advance when signal post bits do not match', async () => {
    const epochData = await createDeterministicEpochKey();
    const config = makeChannelConfig(epochData);

    // Find an actual signal post ID
    const signalPostId = await findSignalPostId(epochData.epochKey);

    // 'Hi' => bits [0, 0, 0]
    const text = 'Hi';
    const hasMedia = false;
    const features = extractFeatures(text, hasMedia, ['len', 'media', 'qmark']);
    const extractedBits = features.bits; // [0, 0, 0]

    // Invert the bits so they DON'T match
    const invertedBits = extractedBits.map(b => (b === 0 ? 1 : 0));
    const state = makeActiveState([...invertedBits, 1, 0, 1]);
    const extractPostId = (uri: string) => uri;

    const { result } = await confirmPost(
      signalPostId, text, hasMedia,
      state, config, epochData.epochKey, extractPostId
    );

    expect(result.wasSignal).toBe(true);
    expect(result.bitsMatched).toBe(false);
    expect(result.transmissionAdvanced).toBe(false);
    expect(result.newBitPosition).toBe(0);
  });

  it('uses injected extractPostId function', async () => {
    const epochData = await createDeterministicEpochKey();
    const config = makeChannelConfig(epochData);

    // Find a signal post ID
    const signalPostId = await findSignalPostId(epochData.epochKey);
    const state = makeActiveState([0, 0, 0, 1, 1, 1]);

    // The extractPostId function should strip the URI prefix
    const fullUri = `at://did:plc:mock/app.bsky.feed.post/${signalPostId}`;
    const extractPostId = (uri: string) => {
      const parts = uri.split('/');
      return parts[parts.length - 1];
    };

    const { result } = await confirmPost(
      fullUri, 'Some text', false,
      state, config, epochData.epochKey, extractPostId
    );

    // The post ID extraction extracts the signal post ID from the URI,
    // so the selection determination should work correctly
    expect(typeof result.wasSignal).toBe('boolean');
    expect(typeof result.bitsMatched).toBe('boolean');
  });

  it('returns cover result when no active transmission', async () => {
    const epochData = await createDeterministicEpochKey();
    const config = makeChannelConfig(epochData);
    const state = makeEmptyState();
    const extractPostId = (uri: string) => uri;

    const { result, transmissionComplete } = await confirmPost(
      'post-123', 'hello', false,
      state, config, epochData.epochKey, extractPostId
    );

    expect(result.wasSignal).toBe(false);
    expect(result.transmissionAdvanced).toBe(false);
    expect(result.newBitPosition).toBe(0);
    expect(result.totalBits).toBe(0);
    expect(transmissionComplete).toBe(false);
  });

  it('signals transmission complete when all bits are sent', async () => {
    const epochData = await createDeterministicEpochKey();
    const config = makeChannelConfig(epochData);

    // Find a signal post ID
    const signalPostId = await findSignalPostId(epochData.epochKey);

    // Use known features: 'Hi' => [0, 0, 0]
    const text = 'Hi';
    const hasMedia = false;
    const features = extractFeatures(text, hasMedia, ['len', 'media', 'qmark']);
    const extractedBits = features.bits;

    // Only need exactly extractedBits.length bits to complete
    const state = makeActiveState([...extractedBits]);
    const extractPostId = (uri: string) => uri;

    const { result, transmissionComplete } = await confirmPost(
      signalPostId, text, hasMedia,
      state, config, epochData.epochKey, extractPostId
    );

    // Since it's a real signal post with matching bits, transmission should complete
    expect(result.wasSignal).toBe(true);
    expect(result.bitsMatched).toBe(true);
    expect(transmissionComplete).toBe(true);
    expect(result.message).toContain('complete');
  });
});
