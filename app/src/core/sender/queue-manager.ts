// Module: core/sender/queue-manager
// Queue and transmission lifecycle for StegoChannel sender pipeline (SPEC.md Section 9.1)

import type { StorageInterface } from '../../storage';
import type { QueuedMessage, TransmissionState, ChannelConfig, CurrentTransmission } from './types';
import { MAX_PAYLOAD_BYTES } from '../protocol/framing';
import { buildMessageFrame } from './message-builder';
import { getEpochKey } from './epoch-manager';
import { persistState } from './state-persistence';

function zeroTransmissionSecrets(tx: CurrentTransmission): void {
  tx.epochKey.fill(0);
  tx.encodedFrame.fill(0);
}

/**
 * Queue a message for transmission.
 * High-priority messages go to front of queue.
 *
 * @param state - Transmission state for the channel (mutated)
 * @param message - Plaintext message to queue
 * @param priority - Message priority
 * @param storage - Storage interface for persistence
 * @returns Message ID of the queued message
 */
export async function queueMessage(
  state: TransmissionState,
  message: string,
  priority: 'normal' | 'high',
  storage: StorageInterface
): Promise<string> {
  const encodedLength = new TextEncoder().encode(message).length;
  if (encodedLength > MAX_PAYLOAD_BYTES) {
    throw new Error(
      `Message too large: ${encodedLength} bytes exceeds maximum ${MAX_PAYLOAD_BYTES} bytes`
    );
  }

  const messageId = crypto.randomUUID();
  const queuedMessage: QueuedMessage = {
    id: messageId,
    plaintext: message,
    queuedAt: Date.now(),
    priority,
  };

  // Add to queue (high priority goes to front)
  if (priority === 'high') {
    state.messageQueue.unshift(queuedMessage);
  } else {
    state.messageQueue.push(queuedMessage);
  }

  // Persist state
  await persistState(storage, state);

  return messageId;
}

/**
 * Cancel the current transmission.
 * Moves the current message back to front of queue.
 *
 * @param state - Transmission state for the channel (mutated)
 * @param storage - Storage interface for persistence
 */
export async function cancelTransmission(
  state: TransmissionState,
  storage: StorageInterface
): Promise<void> {
  if (!state.currentTransmission) {
    return;
  }

  const transmission = state.currentTransmission;

  // Reconstruct queued message and push back to front of queue.
  // The original was shift()'d off in startNextTransmission, so
  // find() would fail silently — we must reconstruct.
  state.messageQueue.unshift({
    id: transmission.messageId,
    plaintext: transmission.plaintext,
    queuedAt: Date.now(),
    priority: 'high',
  });

  zeroTransmissionSecrets(transmission);
  state.currentTransmission = null;
  await persistState(storage, state);
}

/**
 * Start transmission of next queued message.
 * Dequeues the next message, encodes it as a frame, and initializes transmission state.
 *
 * @param state - Transmission state for the channel (mutated)
 * @param channel - Channel configuration
 * @param storage - Storage interface for persistence
 */
export async function startNextTransmission(
  state: TransmissionState,
  channel: ChannelConfig,
  storage: StorageInterface
): Promise<void> {
  if (state.messageQueue.length === 0) {
    return;
  }

  // Dequeue next message
  const message = state.messageQueue.shift()!;

  // Encode message frame
  const { epochKey, epochId, epochExpiresAt } = await getEpochKey(channel, state);
  const payloadBytes = new TextEncoder().encode(message.plaintext);
  const { frame, frameBits } = await buildMessageFrame(
    payloadBytes,
    epochKey,
    false,
    state.messageSequenceNumber
  );

  state.currentTransmission = {
    messageId: message.id,
    plaintext: message.plaintext,
    encodedFrame: frame,
    totalBits: frameBits.length,
    bitPosition: 0,
    pendingBits: frameBits,
    epochKey,
    epochId,
    epochExpiresAt,
    signalPostsUsed: [],
    startedAt: Date.now(),
    lastActivityAt: Date.now(),
  };

  state.messageSequenceNumber++;
  await persistState(storage, state);
}

/**
 * Complete the current transmission.
 * Clears the active transmission and starts the next one if queue is not empty.
 *
 * @param state - Transmission state for the channel (mutated)
 * @param channel - Channel configuration
 * @param storage - Storage interface for persistence
 */
export async function completeTransmission(
  state: TransmissionState,
  channel: ChannelConfig,
  storage: StorageInterface
): Promise<void> {
  if (!state.currentTransmission) {
    return;
  }

  zeroTransmissionSecrets(state.currentTransmission);
  state.currentTransmission = null;
  await persistState(storage, state);

  // Start next transmission if queue not empty
  if (state.messageQueue.length > 0) {
    await startNextTransmission(state, channel, storage);
  }
}
