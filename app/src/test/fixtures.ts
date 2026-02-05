// Module: test/fixtures
// Test fixture factories for StegoChannel

import { isSignalPost } from '../core/protocol/selection';
import { deriveEpochKey } from '../core/crypto';

/**
 * Unified post type matching receiver's UnifiedPost interface
 */
export interface MockUnifiedPost {
  id: string;
  platform: 'bluesky' | 'rss';
  text: string;
  hasMedia: boolean;
  publishedAt: Date;
  source: string;
  uri?: string;
  link?: string;
}

/**
 * Create a mock post with sensible defaults
 *
 * @param overrides - Properties to override
 * @returns Mock unified post
 */
export function createMockPost(
  overrides?: Partial<MockUnifiedPost>
): MockUnifiedPost {
  return {
    id: `mock-post-${Math.random().toString(36).slice(2, 8)}`,
    platform: 'bluesky',
    text: 'This is a test post with some content.',
    hasMedia: false,
    publishedAt: new Date('2025-01-15T12:00:00Z'),
    source: 'alice.bsky.social',
    uri: 'at://did:plc:mock/app.bsky.feed.post/test123',
    ...overrides,
  };
}

/**
 * Create a post that IS a signal post for the given epoch key and rate.
 * Brute-forces post IDs against isSignalPost().
 *
 * Expected iterations: ~4 for rate=0.25 (1/rate).
 * When also matching specific feature bits: ~32 (1/rate * 2^numFeatures for 3-bit features).
 *
 * @param epochKey - Epoch key for selection
 * @param rate - Selection rate (default: 0.25)
 * @param overrides - Properties to override
 * @returns Signal post
 * @throws Error if signal post cannot be found after 10000 attempts
 */
export function createSignalPost(
  epochKey: Uint8Array,
  rate: number = 0.25,
  overrides?: Partial<MockUnifiedPost>
): MockUnifiedPost {
  for (let i = 0; i < 10000; i++) {
    const id = `signal-${i.toString(36)}`;
    if (isSignalPost(epochKey, id, rate)) {
      return createMockPost({ id, ...overrides });
    }
  }
  throw new Error('Failed to find signal post ID after 10000 attempts');
}

/**
 * Create a post that is NOT a signal post for the given epoch key and rate.
 *
 * @param epochKey - Epoch key for selection
 * @param rate - Selection rate (default: 0.25)
 * @param overrides - Properties to override
 * @returns Cover post
 * @throws Error if cover post cannot be found after 10000 attempts
 */
export function createCoverPost(
  epochKey: Uint8Array,
  rate: number = 0.25,
  overrides?: Partial<MockUnifiedPost>
): MockUnifiedPost {
  for (let i = 0; i < 10000; i++) {
    const id = `cover-${i.toString(36)}`;
    if (!isSignalPost(epochKey, id, rate)) {
      return createMockPost({ id, ...overrides });
    }
  }
  throw new Error('Failed to find cover post ID after 10000 attempts');
}

/**
 * Create a mock channel config with defaults
 *
 * @param overrides - Properties to override
 * @returns Mock channel configuration
 */
export function createMockChannel(overrides?: Record<string, unknown>) {
  const key = new Uint8Array(32);
  key[31] = 1; // All zeros except last byte = 0x01

  return {
    id: 'test-channel-001',
    name: 'Test Channel',
    key,
    beaconType: 'date' as const,
    selectionRate: 0.25,
    featureSet: 'v0' as const,
    mySources: [{ platform: 'bluesky' as const, handle: 'alice.bsky.social' }],
    theirSources: [{ platform: 'bluesky' as const, handle: 'bob.bsky.social' }],
    ...overrides,
  };
}

/**
 * Create a deterministic epoch key for testing.
 * Uses a fixed channel key and date beacon value.
 * The epoch key derivation is a pure function of (channelKey, beaconId, beaconValue).
 *
 * @returns Object with channelKey, beaconType, beaconValue, and epochKey
 */
export async function createDeterministicEpochKey() {
  const channelKey = new Uint8Array(32);
  channelKey[31] = 1; // All zeros except last byte = 0x01
  const beaconType = 'date' as const;
  const beaconValue = '2025-01-15';
  const epochKey = await deriveEpochKey(channelKey, beaconType, beaconValue);
  return { channelKey, beaconType, beaconValue, epochKey };
}

/**
 * Create an in-memory StorageInterface implementation (Map-backed, no encryption)
 *
 * @returns Mock storage interface
 */
export function createMockStorage() {
  const store = new Map<string, string>();

  return {
    async saveState(key: string, value: unknown): Promise<void> {
      store.set(key, JSON.stringify(value));
    },
    async getState<T>(key: string): Promise<T | null> {
      const val = store.get(key);
      return val ? (JSON.parse(val) as T) : null;
    },
    async deleteState(key: string): Promise<void> {
      store.delete(key);
    },
    async saveChannel(channel: any): Promise<void> {
      const channels = JSON.parse(store.get('channels') || '{}');
      channels[channel.id] = channel;
      store.set('channels', JSON.stringify(channels));
    },
    async getChannel(id: string): Promise<any> {
      const channels = JSON.parse(store.get('channels') || '{}');
      return channels[id] || null;
    },
    async deleteChannel(id: string): Promise<void> {
      const channels = JSON.parse(store.get('channels') || '{}');
      delete channels[id];
      store.set('channels', JSON.stringify(channels));
    },
    async listChannels(): Promise<any[]> {
      const channels = JSON.parse(store.get('channels') || '{}');
      return Object.values(channels);
    },
    // For direct store access in tests
    _store: store,
  };
}
