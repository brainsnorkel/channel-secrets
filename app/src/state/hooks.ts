// Module: state/hooks
// React integration via useSyncExternalStore

import { useSyncExternalStore } from 'react';
import { subscribe, getDomainState } from './index';
import type { DomainState } from './domains';

/**
 * Subscribe to a specific domain slice with React
 * Uses useSyncExternalStore for concurrent rendering compatibility
 */
export function useDomainState<T>(selector: (state: DomainState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(getDomainState()),
    () => selector(getDomainState())
  );
}

// Convenience hooks for common domain slices

/** Subscribe to channel state (channels, activeChannelId) */
export function useChannelState() {
  return useDomainState((s) => s.channel);
}

/** Subscribe to UI state (view, loading, error) */
export function useUIState() {
  return useDomainState((s) => s.ui);
}

/** Subscribe to sender state (transmissions) */
export function useSenderState() {
  return useDomainState((s) => s.sender);
}

/** Subscribe to security state (unlocked) */
export function useSecurityState() {
  return useDomainState((s) => s.security);
}
