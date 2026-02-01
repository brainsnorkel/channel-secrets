// Module: state
// Simple reactive state management

import type { AppState, Channel, Message, TransmissionState, UIState } from '../schemas';

/**
 * Default initial state
 */
const defaultState: AppState = {
  unlocked: false,
  activeChannelId: null,
  channels: {},
  messages: {},
  transmissionState: {},
  ui: {
    view: 'feed',
    loading: false,
    error: null,
  },
};

/**
 * Global application state
 * Simple reactive state using plain objects
 */
let appState: AppState = JSON.parse(JSON.stringify(defaultState));

/**
 * Subscribers for state changes
 */
type Listener = () => void;
const listeners: Listener[] = [];

/**
 * Subscribe to state changes
 * Returns unsubscribe function
 */
export function subscribe(listener: Listener): () => void {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  };
}

/**
 * Notify all listeners of state change
 */
function notify(): void {
  listeners.forEach(listener => listener());
}

/**
 * Get the entire state (read-only)
 */
export function getState(): Readonly<AppState> {
  return appState;
}

/**
 * Initialize state with default values
 * Call this on app startup
 */
export function initState(): void {
  appState = JSON.parse(JSON.stringify(defaultState));
  notify();
}

/**
 * Get a channel by ID
 */
export function getChannel(id: string): Channel | undefined {
  return appState.channels[id];
}

/**
 * Get all channels
 */
export function getAllChannels(): Record<string, Channel> {
  return appState.channels;
}

/**
 * Add or update a channel
 */
export function setChannel(id: string, channel: Channel): void {
  appState.channels[id] = channel;
  notify();
}

/**
 * Delete a channel
 */
export function deleteChannel(id: string): void {
  delete appState.channels[id];
  delete appState.messages[id];
  delete appState.transmissionState[id];

  // Clear active channel if it was deleted
  if (appState.activeChannelId === id) {
    appState.activeChannelId = null;
  }
  notify();
}

/**
 * Set the active channel
 */
export function setActiveChannel(id: string | null): void {
  appState.activeChannelId = id;
  notify();
}

/**
 * Get the active channel ID
 */
export function getActiveChannelId(): string | null {
  return appState.activeChannelId;
}

/**
 * Get the active channel object
 */
export function getActiveChannel(): Channel | null {
  const id = appState.activeChannelId;
  if (!id) return null;
  return getChannel(id) ?? null;
}

/**
 * Get messages for a channel
 */
export function getMessages(channelId: string): Message[] {
  return appState.messages[channelId] ?? [];
}

/**
 * Add a message to a channel
 */
export function addMessage(channelId: string, message: Message): void {
  if (!appState.messages[channelId]) {
    appState.messages[channelId] = [];
  }
  appState.messages[channelId].push(message);
  notify();
}

/**
 * Set all messages for a channel (replaces existing)
 */
export function setMessages(channelId: string, messages: Message[]): void {
  appState.messages[channelId] = messages;
  notify();
}

/**
 * Get transmission state for a channel
 */
export function getTransmissionState(channelId: string): TransmissionState | undefined {
  return appState.transmissionState[channelId];
}

/**
 * Set transmission state for a channel
 */
export function setTransmissionState(channelId: string, transmissionState: TransmissionState): void {
  appState.transmissionState[channelId] = transmissionState;
  notify();
}

/**
 * Update transmission state (partial update)
 */
export function updateTransmissionState(
  channelId: string,
  updates: Partial<TransmissionState>
): void {
  const current = appState.transmissionState[channelId];

  if (!current) {
    throw new Error(`No transmission state found for channel ${channelId}`);
  }

  appState.transmissionState[channelId] = {
    ...current,
    ...updates,
  };
  notify();
}

/**
 * Clear transmission state for a channel
 */
export function clearTransmissionState(channelId: string): void {
  delete appState.transmissionState[channelId];
  notify();
}

/**
 * UI state helpers
 */

/**
 * Update UI state (partial update)
 */
export function updateUI(updates: Partial<UIState>): void {
  appState.ui = {
    ...appState.ui,
    ...updates,
  };
  notify();
}

/**
 * Set current view
 */
export function setView(view: UIState['view']): void {
  appState.ui.view = view;
  notify();
}

/**
 * Set loading state
 */
export function setLoading(loading: boolean): void {
  appState.ui.loading = loading;
  notify();
}

/**
 * Set error message
 */
export function setError(error: string | null): void {
  appState.ui.error = error;
  notify();
}

/**
 * Clear error
 */
export function clearError(): void {
  appState.ui.error = null;
  notify();
}

/**
 * Get current UI state
 */
export function getUI(): UIState {
  return appState.ui;
}

/**
 * Lock the application (clear unlocked state)
 */
export function lock(): void {
  appState.unlocked = false;
  appState.activeChannelId = null;
  notify();
}

/**
 * Unlock the application
 */
export function unlock(): void {
  appState.unlocked = true;
  notify();
}

/**
 * Check if application is unlocked
 */
export function isUnlocked(): boolean {
  return appState.unlocked;
}

/**
 * Export the entire state (for persistence/debugging)
 */
export function exportState(): AppState {
  return JSON.parse(JSON.stringify(appState));
}

/**
 * Import state (restore from persistence)
 */
export function importState(importedState: Partial<AppState>): void {
  appState = {
    ...appState,
    ...importedState,
  };
  notify();
}

/**
 * Reset state to defaults (useful for logout)
 */
export function resetState(): void {
  initState();
}
