// Module: core/sender
// Facade preserving the public MessageTransmitter API (SPEC.md Section 9)

import type { StorageInterface } from '../../storage';
import { BlueskyAdapter } from '../../adapters/atproto';
import { loadState, persistState } from './state-persistence';
import { getEpochKey } from './epoch-manager';
import { checkPost as checkPostImpl, confirmPost as confirmPostImpl } from './post-selector';
import {
  queueMessage as queueMessageImpl,
  cancelTransmission as cancelTransmissionImpl,
  startNextTransmission,
  completeTransmission,
} from './queue-manager';
import type {
  ChannelConfig, TransmissionState, PostCheckResult,
  ConfirmPostResult, TransmissionStatus,
} from './types';

// Re-export ALL public types
export type {
  QueuedMessage, CurrentTransmission, TransmissionState, PostFeatures,
  PostCheckResult, ConfirmPostResult, TransmissionStatus, ChannelConfig,
  PostFeaturesAnalysis, SignalProbabilityEstimate, ModificationSuggestion,
} from './types';

// Re-export UI helper functions
export { analyzePostFeatures, estimateSignalProbability, suggestModifications } from './sender-utils';

/** Message transmitter for StegoChannel protocol (SPEC.md Section 9). */
export class MessageTransmitter {
  private storage: StorageInterface;
  private channels: Map<string, ChannelConfig> = new Map();
  private states: Map<string, TransmissionState> = new Map();

  constructor(storage: StorageInterface) {
    this.storage = storage;
  }

  /** Register a channel for transmission. */
  registerChannel(config: ChannelConfig): void {
    this.channels.set(config.id, {
      ...config,
      selectionRate: config.selectionRate ?? 0.25,
      featureSet: config.featureSet ?? ['len', 'media', 'qmark'],
    });
  }

  /** Queue a message for transmission (SPEC Section 9.1). */
  async queueMessage(
    channelId: string,
    message: string,
    priority: 'normal' | 'high' = 'normal'
  ): Promise<string> {
    const channel = this.requireChannel(channelId);
    const state = await this.ensureState(channelId);
    const messageId = await queueMessageImpl(state, message, priority, this.storage);
    if (!state.currentTransmission) {
      await startNextTransmission(state, channel, this.storage);
    }
    return messageId;
  }

  /** Check what bits a draft post would encode (SPEC Section 9.1). */
  async checkPost(channelId: string, text: string, hasMedia: boolean): Promise<PostCheckResult> {
    const channel = this.requireChannel(channelId);
    const state = await this.ensureState(channelId);
    return checkPostImpl(text, hasMedia, state, channel);
  }

  /** Confirm a published post and advance transmission if signal (SPEC Section 9.1). */
  async confirmPost(
    channelId: string, postUri: string, text: string, hasMedia: boolean
  ): Promise<ConfirmPostResult> {
    const channel = this.requireChannel(channelId);
    const state = await this.ensureState(channelId);
    const { epochKey } = await getEpochKey(channel, state);
    const { result, transmissionComplete } = await confirmPostImpl(
      postUri, text, hasMedia, state, channel, epochKey,
      BlueskyAdapter.extractPostId
    );
    if (transmissionComplete) {
      await completeTransmission(state, channel, this.storage);
    } else if (result.transmissionAdvanced) {
      await persistState(this.storage, state);
    }
    return result;
  }

  /** Get transmission status for a channel. */
  async getStatus(channelId: string): Promise<TransmissionStatus> {
    const state = await this.ensureState(channelId);
    const channel = this.channels.get(channelId);
    if (!state.currentTransmission) {
      return {
        active: false,
        queueLength: state.messageQueue.length,
        beaconType: channel?.beaconType,
      };
    }
    const tx = state.currentTransmission;
    return {
      active: true,
      messageId: tx.messageId,
      progress: {
        bitsSent: tx.bitPosition,
        totalBits: tx.totalBits,
        percentage: (tx.bitPosition / tx.totalBits) * 100,
      },
      queueLength: state.messageQueue.length,
      beaconType: channel?.beaconType,
      epochInfo: {
        epochId: tx.epochId,
        expiresAt: tx.epochExpiresAt,
        timeRemaining: Math.max(0, tx.epochExpiresAt - Date.now()),
      },
    };
  }

  /** Cancel current transmission. */
  async cancelTransmission(channelId: string): Promise<void> {
    const state = this.states.get(channelId);
    if (!state?.currentTransmission) return;
    await cancelTransmissionImpl(state, this.storage);
  }

  /** Get pending bits for the active transmission (defensive copy). */
  getPendingBits(channelId: string): number[] | null {
    const state = this.states.get(channelId);
    if (!state?.currentTransmission) return null;
    return [...state.currentTransmission.pendingBits];
  }

  /** Ensure state is loaded for a channel. */
  private async ensureState(channelId: string): Promise<TransmissionState> {
    let state = this.states.get(channelId);
    if (!state) {
      state = await loadState(this.storage, channelId);
      this.states.set(channelId, state);
    }
    return state;
  }

  /** Get channel config or throw. */
  private requireChannel(channelId: string): ChannelConfig {
    const channel = this.channels.get(channelId);
    if (!channel) throw new Error(`Channel ${channelId} not registered`);
    return channel;
  }
}

/**
 * Get the next N bits required for active transmission on a channel.
 * Returns null if no active transmission exists.
 */
export async function getNextRequiredBits(
  transmitter: MessageTransmitter,
  channelId: string,
  maxBits: number = 3
): Promise<number[] | null> {
  const status = await transmitter.getStatus(channelId);
  if (!status.active) return null;
  const pending = transmitter.getPendingBits(channelId);
  if (!pending) return null;
  return pending.slice(0, maxBits);
}
