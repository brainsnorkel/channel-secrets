// Module: core/receiver/poll-manager
// Polling lifecycle management for channel monitoring

import type { FeedAdapters } from './feed-fetcher';
import { processChannel } from './frame-decoder';
import type { ChannelConfig, DecodedMessage } from './types';

/**
 * Manages polling timers for channel monitoring.
 * Each channel gets its own interval timer identified by channelId.
 */
export class PollManager {
  private pollTimers: Map<string, ReturnType<typeof setInterval>> = new Map();
  private pollIntervalMs: number;

  constructor(pollIntervalMs: number = 5 * 60 * 1000) {
    this.pollIntervalMs = pollIntervalMs;
  }

  /**
   * Start automatic polling for a channel.
   *
   * @param channelId - Unique channel identifier
   * @param channel - Channel configuration
   * @param adapters - Platform adapters for fetching
   * @param onMessage - Callback when message is decoded
   */
  startPolling(
    channelId: string,
    channel: ChannelConfig,
    adapters: FeedAdapters,
    onMessage: (message: DecodedMessage) => void
  ): void {
    // Clear existing timer
    this.stopPolling(channelId);

    // Poll function
    const poll = async () => {
      try {
        const message = await processChannel(channel, adapters);
        if (message) {
          onMessage(message);
        }
      } catch (error) {
        console.error(`Polling error for channel ${channelId}:`, error);
      }
    };

    // Initial poll
    poll();

    // Set up interval
    const timer = setInterval(poll, this.pollIntervalMs);
    this.pollTimers.set(channelId, timer);
  }

  /**
   * Stop polling for a specific channel.
   *
   * @param channelId - Channel identifier
   */
  stopPolling(channelId: string): void {
    const timer = this.pollTimers.get(channelId);
    if (timer) {
      clearInterval(timer);
      this.pollTimers.delete(channelId);
    }
  }

  /**
   * Stop all polling across all channels.
   */
  stopAllPolling(): void {
    this.pollTimers.forEach((timer) => {
      clearInterval(timer);
    });
    this.pollTimers.clear();
  }
}
