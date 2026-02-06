// Module: core/receiver/poll-manager
// Polling lifecycle management for channel monitoring

import type { FeedAdapters } from './feed-fetcher';
import { processChannel } from './frame-decoder';
import type { ChannelConfig, DecodedMessage } from './types';

export class PollManager {
  private pollTimers: Map<string, ReturnType<typeof setInterval>> = new Map();
  private seqNums: Map<string, number> = new Map();
  private pollIntervalMs: number;

  constructor(pollIntervalMs: number = 5 * 60 * 1000) {
    this.pollIntervalMs = pollIntervalMs;
  }

  getSeqNum(channelId: string): number {
    return this.seqNums.get(channelId) ?? 0;
  }

  setSeqNum(channelId: string, seqNum: number): void {
    this.seqNums.set(channelId, seqNum);
  }

  startPolling(
    channelId: string,
    channel: ChannelConfig,
    adapters: FeedAdapters,
    onMessage: (message: DecodedMessage) => void
  ): void {
    this.stopPolling(channelId);

    const poll = async () => {
      try {
        const seqNum = this.getSeqNum(channelId);
        const message = await processChannel(channel, adapters, seqNum);
        if (message) {
          this.seqNums.set(channelId, seqNum + 1);
          onMessage(message);
        }
      } catch (error) {
        console.error(`Polling error for channel ${channelId}:`, error);
      }
    };

    poll();

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
