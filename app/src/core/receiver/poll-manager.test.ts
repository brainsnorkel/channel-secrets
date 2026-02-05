import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PollManager } from './poll-manager';
import type { ChannelConfig, DecodedMessage } from './types';
import type { FeatureId } from '../protocol/features';

// Mock the frame-decoder module so processChannel doesn't perform real crypto
vi.mock('./frame-decoder', () => ({
  processChannel: vi.fn().mockResolvedValue(null),
}));

import { processChannel } from './frame-decoder';
const mockProcessChannel = vi.mocked(processChannel);

/**
 * Helper: flush the microtask queue so the fire-and-forget `poll()` resolves.
 * We cannot use vi.runAllTimersAsync() because setInterval + async poll
 * creates an unbounded timer loop.
 */
function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => resolve());
}

describe('poll-manager', () => {
  let pollManager: PollManager;

  const mockChannel: ChannelConfig = {
    channelKey: new Uint8Array(32),
    beaconType: 'date',
    selectionRate: 0.25,
    featureSet: ['len', 'media', 'qmark'] as FeatureId[],
    lengthThreshold: 50,
    theirSources: [{ type: 'bluesky', identifier: 'bob.bsky.social' }],
  };

  beforeEach(() => {
    vi.useFakeTimers();
    pollManager = new PollManager(10_000); // 10 second interval for tests
    mockProcessChannel.mockReset();
    mockProcessChannel.mockResolvedValue(null);
  });

  afterEach(() => {
    pollManager.stopAllPolling();
    vi.useRealTimers();
  });

  // ---------------------------------------------------------------------------
  // startPolling invokes callback immediately
  // ---------------------------------------------------------------------------

  it('startPolling invokes an immediate poll', async () => {
    const onMessage = vi.fn();

    pollManager.startPolling('ch1', mockChannel, {}, onMessage);

    // The initial poll() is fire-and-forget; flush its microtask
    await flushMicrotasks();
    await flushMicrotasks();

    expect(mockProcessChannel).toHaveBeenCalledTimes(1);
  });

  // ---------------------------------------------------------------------------
  // startPolling invokes callback on interval
  // ---------------------------------------------------------------------------

  it('polls at the configured interval', async () => {
    const onMessage = vi.fn();

    pollManager.startPolling('ch1', mockChannel, {}, onMessage);

    // Flush initial poll
    await flushMicrotasks();
    await flushMicrotasks();
    expect(mockProcessChannel).toHaveBeenCalledTimes(1);

    // Advance by one interval
    await vi.advanceTimersByTimeAsync(10_000);
    expect(mockProcessChannel).toHaveBeenCalledTimes(2);

    // Advance by another interval
    await vi.advanceTimersByTimeAsync(10_000);
    expect(mockProcessChannel).toHaveBeenCalledTimes(3);
  });

  // ---------------------------------------------------------------------------
  // Calls onMessage when processChannel returns a message
  // ---------------------------------------------------------------------------

  it('calls onMessage when a message is decoded', async () => {
    const fakeMessage: DecodedMessage = {
      payload: new Uint8Array([72, 105]),
      version: 0,
      encrypted: false,
      epochKey: new Uint8Array(32),
      bitCount: 100,
      decodedAt: new Date(),
    };

    mockProcessChannel.mockResolvedValueOnce(fakeMessage);

    const onMessage = vi.fn();
    pollManager.startPolling('ch1', mockChannel, {}, onMessage);

    // Flush initial poll
    await flushMicrotasks();
    await flushMicrotasks();

    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(onMessage).toHaveBeenCalledWith(fakeMessage);
  });

  // ---------------------------------------------------------------------------
  // stopPolling clears the timer for a specific channel
  // ---------------------------------------------------------------------------

  it('stopPolling clears timer for a specific channel', async () => {
    const onMessage = vi.fn();

    pollManager.startPolling('ch1', mockChannel, {}, onMessage);

    // Flush initial poll
    await flushMicrotasks();
    await flushMicrotasks();
    expect(mockProcessChannel).toHaveBeenCalledTimes(1);

    // Stop polling
    pollManager.stopPolling('ch1');

    // Advance time -- should NOT trigger another poll
    mockProcessChannel.mockClear();
    await vi.advanceTimersByTimeAsync(50_000);
    expect(mockProcessChannel).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // stopAllPolling clears all timers
  // ---------------------------------------------------------------------------

  it('stopAllPolling clears all channel timers', async () => {
    const onMessage1 = vi.fn();
    const onMessage2 = vi.fn();

    pollManager.startPolling('ch1', mockChannel, {}, onMessage1);
    pollManager.startPolling('ch2', mockChannel, {}, onMessage2);

    // Flush initial polls
    await flushMicrotasks();
    await flushMicrotasks();
    expect(mockProcessChannel).toHaveBeenCalledTimes(2);

    // Stop all
    pollManager.stopAllPolling();

    mockProcessChannel.mockClear();
    await vi.advanceTimersByTimeAsync(50_000);
    expect(mockProcessChannel).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Restarting polling for same channel clears previous timer
  // ---------------------------------------------------------------------------

  it('restarting polling clears the previous timer', async () => {
    const onMessage = vi.fn();

    pollManager.startPolling('ch1', mockChannel, {}, onMessage);
    await flushMicrotasks();
    await flushMicrotasks();
    expect(mockProcessChannel).toHaveBeenCalledTimes(1);

    // Restart polling on the same channel
    mockProcessChannel.mockClear();
    pollManager.startPolling('ch1', mockChannel, {}, onMessage);
    await flushMicrotasks();
    await flushMicrotasks();

    // Should have been called once for the new initial poll
    expect(mockProcessChannel).toHaveBeenCalledTimes(1);

    // Advance one interval -- only one timer should fire
    mockProcessChannel.mockClear();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(mockProcessChannel).toHaveBeenCalledTimes(1);
  });

  // ---------------------------------------------------------------------------
  // Polling errors don't crash the manager
  // ---------------------------------------------------------------------------

  it('handles processChannel errors gracefully', async () => {
    mockProcessChannel.mockRejectedValueOnce(new Error('Network failure'));

    const onMessage = vi.fn();
    pollManager.startPolling('ch1', mockChannel, {}, onMessage);

    // Flush initial (erroring) poll -- should not throw
    await flushMicrotasks();
    await flushMicrotasks();

    expect(onMessage).not.toHaveBeenCalled();

    // Next poll works fine
    mockProcessChannel.mockResolvedValueOnce(null);
    await vi.advanceTimersByTimeAsync(10_000);
    // No crash - poll manager is still running
    expect(mockProcessChannel).toHaveBeenCalledTimes(2);
  });
});
