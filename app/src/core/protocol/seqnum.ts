// Module: core/protocol/seqnum
// Message sequence number management per SPEC Section 8.3

/**
 * In-memory sequence number tracking.
 * For full persistence, these should be backed by IndexedDB via storage module.
 * Per SPEC 8.3: sequence numbers are per-channel, start at 0, never reuse.
 */

const senderSeqNums = new Map<string, number>();
const receiverSeqNums = new Map<string, number>();

/** Get current sender sequence number for a channel */
export function getSenderSeqNum(channelId: string): number {
  return senderSeqNums.get(channelId) ?? 0;
}

/** Increment sender sequence number after successful transmission */
export function incrementSenderSeqNum(channelId: string): number {
  const current = getSenderSeqNum(channelId);
  const next = current + 1;
  senderSeqNums.set(channelId, next);
  return next;
}

/** Get current receiver sequence number for a channel */
export function getReceiverSeqNum(channelId: string): number {
  return receiverSeqNums.get(channelId) ?? 0;
}

/** Increment receiver sequence number after successful reception */
export function incrementReceiverSeqNum(channelId: string): number {
  const current = getReceiverSeqNum(channelId);
  const next = current + 1;
  receiverSeqNums.set(channelId, next);
  return next;
}

/** Set sender sequence number (for restoring from persistent storage) */
export function setSenderSeqNum(channelId: string, seqNum: number): void {
  senderSeqNums.set(channelId, seqNum);
}

/** Set receiver sequence number (for restoring from persistent storage) */
export function setReceiverSeqNum(channelId: string, seqNum: number): void {
  receiverSeqNums.set(channelId, seqNum);
}

/** Clear sequence numbers for a channel (e.g., on channel deletion) */
export function clearSeqNums(channelId: string): void {
  senderSeqNums.delete(channelId);
  receiverSeqNums.delete(channelId);
}

/** Clear all sequence numbers (for testing) */
export function clearAllSeqNums(): void {
  senderSeqNums.clear();
  receiverSeqNums.clear();
}
