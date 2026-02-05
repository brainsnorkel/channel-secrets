// Module: state
// Domain-isolated reactive state management with security hardening

import type { AppState, Channel, Message, TransmissionState, UIState } from '../schemas';
import type { DomainState } from './domains';
import { updateDomain } from './updates';
import { assertUnlocked } from './guards';
import { zeroSensitiveState } from './security';
import { logTransition } from './logger';

// Re-export domain types for external use
export type { DomainState } from './domains';

/**
 * Default initial domain state
 */
const defaultDomainState: DomainState = {
  sender: { transmissions: {} },
  receiver: { messages: {}, lastPollTime: {} },
  channel: { channels: {}, activeChannelId: null },
  security: { unlocked: false, _keyCache: new Map() },
  ui: { view: 'feed', loading: false, error: null },
};

/**
 * Global application state (domain-isolated)
 */
let domainState: DomainState = {
  ...defaultDomainState,
  security: { unlocked: false, _keyCache: new Map() },
};

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
  listeners.forEach((listener) => listener());
}

/**
 * Apply a domain update with logging
 */
function applyUpdate<K extends keyof DomainState>(
  domain: K,
  action: string,
  updater: (current: DomainState[K]) => DomainState[K]
): void {
  const prev = domainState;
  domainState = updateDomain(domainState, domain, updater);
  logTransition(domain, action, prev, domainState);
  notify();
}

/**
 * Get domain state (for hooks)
 */
export function getDomainState(): DomainState {
  return domainState;
}

/**
 * Get the entire state as AppState (read-only, backward compat)
 */
export function getState(): Readonly<AppState> {
  return {
    unlocked: domainState.security.unlocked,
    activeChannelId: domainState.channel.activeChannelId,
    channels: domainState.channel.channels as Record<string, Channel>,
    messages: domainState.receiver.messages as Record<string, Message[]>,
    transmissionState: domainState.sender.transmissions as Record<string, TransmissionState>,
    ui: domainState.ui as UIState,
  };
}

/**
 * Initialize state with default values
 */
export function initState(): void {
  domainState = {
    ...defaultDomainState,
    security: { unlocked: false, _keyCache: new Map() },
  };
  notify();
}

// Channel operations (require unlocked for mutations)

export function getChannel(id: string): Channel | undefined {
  return domainState.channel.channels[id];
}

export function getAllChannels(): Record<string, Channel> {
  return domainState.channel.channels as Record<string, Channel>;
}

export function setChannel(id: string, channel: Channel): void {
  assertUnlocked(domainState);
  applyUpdate('channel', 'setChannel', (current) => ({
    ...current,
    channels: { ...current.channels, [id]: channel },
  }));
}

export function deleteChannel(id: string): void {
  assertUnlocked(domainState);
  const { [id]: _removed, ...remainingChannels } = domainState.channel.channels;
  const { [id]: _removedMsgs, ...remainingMessages } = domainState.receiver.messages;
  const { [id]: _removedTx, ...remainingTx } = domainState.sender.transmissions;
  const { [id]: _removedPoll, ...remainingPollTimes } = domainState.receiver.lastPollTime;

  applyUpdate('channel', 'deleteChannel', (current) => ({
    ...current,
    channels: remainingChannels,
    activeChannelId: current.activeChannelId === id ? null : current.activeChannelId,
  }));

  // Also clean up other domains
  applyUpdate('receiver', 'deleteChannel', () => ({
    messages: remainingMessages,
    lastPollTime: remainingPollTimes,
  }));

  applyUpdate('sender', 'deleteChannel', () => ({
    transmissions: remainingTx,
  }));
}

export function setActiveChannel(id: string | null): void {
  applyUpdate('channel', 'setActiveChannel', (current) => ({
    ...current,
    activeChannelId: id,
  }));
}

export function getActiveChannelId(): string | null {
  return domainState.channel.activeChannelId;
}

export function getActiveChannel(): Channel | null {
  const id = domainState.channel.activeChannelId;
  if (!id) return null;
  return getChannel(id) ?? null;
}

// Message operations

export function getMessages(channelId: string): Message[] {
  return (domainState.receiver.messages[channelId] ?? []) as Message[];
}

export function addMessage(channelId: string, message: Message): void {
  assertUnlocked(domainState);
  applyUpdate('receiver', 'addMessage', (current) => ({
    ...current,
    messages: {
      ...current.messages,
      [channelId]: [...(current.messages[channelId] ?? []), message],
    },
  }));
}

export function setMessages(channelId: string, messages: Message[]): void {
  applyUpdate('receiver', 'setMessages', (current) => ({
    ...current,
    messages: { ...current.messages, [channelId]: messages },
  }));
}

// Transmission operations

export function getTransmissionState(channelId: string): TransmissionState | undefined {
  return domainState.sender.transmissions[channelId] as TransmissionState | undefined;
}

export function setTransmissionState(
  channelId: string,
  transmissionState: TransmissionState
): void {
  assertUnlocked(domainState);
  applyUpdate('sender', 'setTransmissionState', (current) => ({
    ...current,
    transmissions: { ...current.transmissions, [channelId]: transmissionState },
  }));
}

export function updateTransmissionState(
  channelId: string,
  updates: Partial<TransmissionState>
): void {
  const current = domainState.sender.transmissions[channelId];
  if (!current) {
    throw new Error(`No transmission state found for channel ${channelId}`);
  }
  applyUpdate('sender', 'updateTransmissionState', (s) => ({
    ...s,
    transmissions: {
      ...s.transmissions,
      [channelId]: { ...current, ...updates } as TransmissionState,
    },
  }));
}

export function clearTransmissionState(channelId: string): void {
  const { [channelId]: _removed, ...remaining } = domainState.sender.transmissions;
  applyUpdate('sender', 'clearTransmissionState', () => ({
    transmissions: remaining,
  }));
}

// UI operations

export function updateUI(updates: Partial<UIState>): void {
  applyUpdate('ui', 'updateUI', (current) => ({
    ...current,
    ...updates,
  }));
}

export function setView(view: UIState['view']): void {
  applyUpdate('ui', 'setView', (current) => ({ ...current, view }));
}

export function setLoading(loading: boolean): void {
  applyUpdate('ui', 'setLoading', (current) => ({ ...current, loading }));
}

export function setError(error: string | null): void {
  applyUpdate('ui', 'setError', (current) => ({ ...current, error }));
}

export function clearError(): void {
  applyUpdate('ui', 'clearError', (current) => ({ ...current, error: null }));
}

export function getUI(): UIState {
  return domainState.ui as UIState;
}

// Security operations

export function lock(): void {
  domainState = zeroSensitiveState(domainState);
  notify();
}

export function unlock(): void {
  applyUpdate('security', 'unlock', (current) => ({
    ...current,
    unlocked: true,
  }));
}

export function isUnlocked(): boolean {
  return domainState.security.unlocked;
}

// Persistence operations (backward compat)

export function exportState(): AppState {
  return JSON.parse(JSON.stringify(getState()));
}

export function importState(importedState: Partial<AppState>): void {
  if (importedState.channels !== undefined) {
    applyUpdate('channel', 'importState', (current) => ({
      ...current,
      channels: importedState.channels ?? current.channels,
      activeChannelId: importedState.activeChannelId ?? current.activeChannelId,
    }));
  }
  if (importedState.messages !== undefined) {
    applyUpdate('receiver', 'importState', (current) => ({
      ...current,
      messages: importedState.messages ?? current.messages,
    }));
  }
  if (importedState.transmissionState !== undefined) {
    applyUpdate('sender', 'importState', (current) => ({
      transmissions: importedState.transmissionState ?? current.transmissions,
    }));
  }
  if (importedState.ui !== undefined) {
    applyUpdate('ui', 'importState', () => importedState.ui!);
  }
  if (importedState.unlocked !== undefined) {
    applyUpdate('security', 'importState', (current) => ({
      ...current,
      unlocked: importedState.unlocked!,
    }));
  }
}

export function resetState(): void {
  initState();
}
