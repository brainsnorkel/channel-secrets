// Module: state/security
// Memory zeroing and key cache management for security hardening

import sodium from 'libsodium-wrappers-sumo';
import type { DomainState } from './domains';

/**
 * Cache a decoded Uint8Array key for later zeroing
 * Keys are stored by channel ID for targeted cleanup
 */
export function cacheKey(
  keyCache: Map<string, Uint8Array>,
  channelId: string,
  key: Uint8Array
): void {
  keyCache.set(channelId, key);
}

/**
 * Remove a cached key (zero it first)
 * Securely wipes the key from memory before removing from cache
 */
export function removeCachedKey(
  keyCache: Map<string, Uint8Array>,
  channelId: string
): void {
  const key = keyCache.get(channelId);
  if (key) {
    sodium.memzero(key);
    keyCache.delete(channelId);
  }
}

/**
 * Zero all cached keys and clear sensitive state
 * Called on lock() to ensure no key material remains in memory
 */
export function zeroSensitiveState(state: DomainState): DomainState {
  // Zero all cached Uint8Array keys
  for (const key of state.security._keyCache.values()) {
    sodium.memzero(key);
  }

  return {
    ...state,
    security: { unlocked: false, _keyCache: new Map() },
    sender: { transmissions: {} },
    receiver: { messages: {}, lastPollTime: {} },
  };
}
