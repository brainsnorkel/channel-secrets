// Module: state/guards
// State transition guards for security enforcement

import type { DomainState } from './domains';

/**
 * Assert that the application is unlocked
 * Throws if the app is locked
 */
export function assertUnlocked(state: DomainState): void {
  if (!state.security.unlocked) {
    throw new Error('State guard: app is locked');
  }
}

/**
 * Assert that an active channel is selected
 * Throws if no channel is active
 */
export function assertActiveChannel(state: DomainState): void {
  if (!state.channel.activeChannelId) {
    throw new Error('State guard: no active channel');
  }
}

/**
 * Assert that no active transmission exists for a channel
 * Throws if a transmission is pending or in-progress
 */
export function assertNoActiveTx(state: DomainState, channelId: string): void {
  const tx = state.sender.transmissions[channelId];
  if (tx && (tx.status === 'in-progress' || tx.status === 'pending')) {
    throw new Error(`State guard: active transmission exists for channel ${channelId}`);
  }
}
