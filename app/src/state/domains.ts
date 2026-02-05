// Module: state/domains
// Domain-isolated state type definitions for security hardening

import type { TransmissionState, UIState, Message, Channel } from '../schemas';

/**
 * Sender domain state
 * Manages outbound transmission state per channel
 */
export interface SenderState {
  readonly transmissions: Readonly<Record<string, TransmissionState>>;
}

/**
 * Receiver domain state
 * Manages inbound messages and polling state per channel
 */
export interface ReceiverState {
  readonly messages: Readonly<Record<string, readonly Message[]>>;
  readonly lastPollTime: Readonly<Record<string, number>>;
}

/**
 * Channel domain state
 * Manages channel configurations and active selection
 */
export interface ChannelState {
  readonly channels: Readonly<Record<string, Channel>>;
  readonly activeChannelId: string | null;
}

/**
 * Security domain state
 * Manages unlock state and sensitive key material
 */
export interface SecurityState {
  readonly unlocked: boolean;
  readonly _keyCache: Map<string, Uint8Array>;
}

/**
 * Complete domain-isolated state
 * Each domain is independently updateable with immutable semantics
 */
export interface DomainState {
  readonly sender: SenderState;
  readonly receiver: ReceiverState;
  readonly channel: ChannelState;
  readonly security: SecurityState;
  readonly ui: UIState;
}
