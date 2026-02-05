// Module: core/sender/state-persistence
// State load/save for StegoChannel sender pipeline

import type { StorageInterface } from '../../storage';
import type { TransmissionState } from './types';

/**
 * Load transmission state from storage.
 * Returns existing state if found, otherwise initializes a new empty state.
 *
 * @param storage - Storage interface for persistence
 * @param channelId - Channel identifier
 * @returns Transmission state for the channel
 */
export async function loadState(
  storage: StorageInterface,
  channelId: string
): Promise<TransmissionState> {
  const stored = await storage.getState<TransmissionState>(`transmission:${channelId}`);
  if (stored) {
    return stored;
  }

  // Initialize new state
  return {
    channelId,
    messageQueue: [],
    currentTransmission: null,
    messageSequenceNumber: 0,
  };
}

/**
 * Persist transmission state to storage.
 *
 * @param storage - Storage interface for persistence
 * @param state - Transmission state to save
 */
export async function persistState(
  storage: StorageInterface,
  state: TransmissionState
): Promise<void> {
  await storage.saveState(`transmission:${state.channelId}`, state);
}
