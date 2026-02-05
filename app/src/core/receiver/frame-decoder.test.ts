import { describe, it, expect, beforeAll, vi } from 'vitest';
import { createDeterministicEpochKey } from '../../test/fixtures';
import { encodeFrame, frameToBits } from '../protocol/framing';
import { deriveEpochKey } from '../crypto';

// Mock the beacon module before importing frame-decoder
vi.mock('../beacon', () => ({
  getBeaconValue: vi.fn().mockResolvedValue('2025-01-15'),
  getEpochInfo: vi.fn().mockReturnValue({
    beaconType: 'date',
    epochDuration: 86400_000,
    epochsToCheck: 1,
  }),
  getBeaconHistory: vi.fn().mockReturnValue(['2025-01-15']),
  formatDateBeacon: vi.fn().mockImplementation((date: Date) => {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  }),
  clearBeaconCache: vi.fn(),
  clearBeaconHistory: vi.fn(),
}));

import {
  tryDecodeMessage,
  deriveEpochKeysForGracePeriod,
} from './frame-decoder';

describe('frame-decoder', () => {
  let epochKey: Uint8Array;
  let channelKey: Uint8Array;

  beforeAll(async () => {
    const result = await createDeterministicEpochKey();
    epochKey = result.epochKey;
    channelKey = result.channelKey;
  });

  // ---------------------------------------------------------------------------
  // Decodes valid unencrypted frame (encode -> toBits -> decode)
  // ---------------------------------------------------------------------------

  it('decodes a valid unencrypted frame via encode/toBits round-trip', async () => {
    const payload = new TextEncoder().encode('hello');
    const frameBytes = await encodeFrame(payload, epochKey, false, 0);

    // Convert frame to bits (as the receiver would accumulate them)
    const bits = frameToBits(frameBytes);

    // tryDecodeMessage converts bits back to bytes and decodes
    const result = await tryDecodeMessage(bits, epochKey, 0);

    expect(result).not.toBeNull();
    expect(result!.version).toBe(0);
    expect(result!.encrypted).toBe(false);
    expect(new TextDecoder().decode(result!.payload)).toBe('hello');
    expect(result!.bitCount).toBe(bits.length);
    expect(result!.decodedAt).toBeInstanceOf(Date);
  });

  // ---------------------------------------------------------------------------
  // Decodes valid encrypted frame
  // ---------------------------------------------------------------------------

  it('decodes a valid encrypted frame via encode/toBits round-trip', async () => {
    const payload = new TextEncoder().encode('secret');
    const frameBytes = await encodeFrame(payload, epochKey, true, 0);
    const bits = frameToBits(frameBytes);

    const result = await tryDecodeMessage(bits, epochKey, 0);

    expect(result).not.toBeNull();
    expect(result!.encrypted).toBe(true);
    expect(new TextDecoder().decode(result!.payload)).toBe('secret');
  });

  // ---------------------------------------------------------------------------
  // Returns null for insufficient bits
  // ---------------------------------------------------------------------------

  it('returns null for insufficient bits (< 88)', async () => {
    const shortBits = new Array(50).fill(0);
    const result = await tryDecodeMessage(shortBits, epochKey, 0);
    expect(result).toBeNull();
  });

  it('returns null for exactly 87 bits', async () => {
    const bits = new Array(87).fill(0);
    const result = await tryDecodeMessage(bits, epochKey, 0);
    expect(result).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // Returns null for invalid auth tag (wrong key)
  // ---------------------------------------------------------------------------

  it('returns null for invalid auth tag (wrong epoch key)', async () => {
    const payload = new TextEncoder().encode('test');
    const frameBytes = await encodeFrame(payload, epochKey, false, 0);
    const bits = frameToBits(frameBytes);

    // Decode with a different key
    const wrongKey = new Uint8Array(32);
    wrongKey[0] = 0xFF;
    wrongKey[31] = 0xAA;

    const result = await tryDecodeMessage(bits, wrongKey, 0);
    expect(result).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // Returns null for garbage bits
  // ---------------------------------------------------------------------------

  it('returns null for random garbage bits', async () => {
    // 200 random bits -- extremely unlikely to form a valid frame
    const garbageBits = Array.from({ length: 200 }, () => Math.round(Math.random()));
    const result = await tryDecodeMessage(garbageBits, epochKey, 0);
    expect(result).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // Grace period epoch key derivation (date beacon)
  // ---------------------------------------------------------------------------

  describe('deriveEpochKeysForGracePeriod', () => {
    it('derives keys for current and previous epochs with date beacon', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-01-15T12:00:00Z'));

      const keys = await deriveEpochKeysForGracePeriod(channelKey, 'date');

      // epochsToCheck = 1, so we get today + 1 previous day = 2 keys
      expect(keys).toHaveLength(2);

      // First key is for today (2025-01-15)
      expect(keys[0].beaconValue).toBe('2025-01-15');

      // Second key is for yesterday (2025-01-14)
      expect(keys[1].beaconValue).toBe('2025-01-14');

      // Each key should be 32 bytes
      expect(keys[0].epochKey).toHaveLength(32);
      expect(keys[1].epochKey).toHaveLength(32);

      // Keys should differ between epochs
      expect(keys[0].epochKey).not.toEqual(keys[1].epochKey);

      // Verify the current epoch key matches our deterministic fixture
      const expectedKey = await deriveEpochKey(channelKey, 'date', '2025-01-15');
      expect(keys[0].epochKey).toEqual(expectedKey);

      vi.useRealTimers();
    });

    it('derives keys for BTC beacon using beacon history', async () => {
      // Import the mocked module to set up BTC-specific behavior
      const beacon = await import('../beacon');
      const mockGetEpochInfo = vi.mocked(beacon.getEpochInfo);
      const mockGetBeaconHistory = vi.mocked(beacon.getBeaconHistory);

      mockGetEpochInfo.mockReturnValue({
        beaconType: 'btc',
        epochDuration: 600_000,
        epochsToCheck: 2,
        gracePeriod: 1200,
      } as any);
      mockGetBeaconHistory.mockReturnValue([
        '000000000000000000026a42block1',
        '000000000000000000026a42block2',
      ]);

      const keys = await deriveEpochKeysForGracePeriod(channelKey, 'btc');

      expect(keys).toHaveLength(2);
      expect(keys[0].beaconValue).toBe('000000000000000000026a42block1');
      expect(keys[1].beaconValue).toBe('000000000000000000026a42block2');

      // Each key is 32 bytes
      expect(keys[0].epochKey).toHaveLength(32);
      expect(keys[1].epochKey).toHaveLength(32);

      // Restore
      mockGetEpochInfo.mockReturnValue({
        beaconType: 'date',
        epochDuration: 86400_000,
        epochsToCheck: 1,
      } as any);
      mockGetBeaconHistory.mockReturnValue(['2025-01-15']);
    });

    it('falls back to getBeaconValue for BTC when history is empty', async () => {
      const beacon = await import('../beacon');
      const mockGetEpochInfo = vi.mocked(beacon.getEpochInfo);
      const mockGetBeaconHistory = vi.mocked(beacon.getBeaconHistory);
      const mockGetBeaconValue = vi.mocked(beacon.getBeaconValue);

      mockGetEpochInfo.mockReturnValue({
        beaconType: 'btc',
        epochDuration: 600_000,
        epochsToCheck: 2,
        gracePeriod: 1200,
      } as any);
      mockGetBeaconHistory.mockReturnValue([]);
      mockGetBeaconValue.mockResolvedValue('000000000000000000026a42fallback');

      const keys = await deriveEpochKeysForGracePeriod(channelKey, 'btc');

      // Should fall back to a single key from getBeaconValue
      expect(keys).toHaveLength(1);
      expect(keys[0].beaconValue).toBe('000000000000000000026a42fallback');
      expect(mockGetBeaconValue).toHaveBeenCalledWith('btc');

      // Restore
      mockGetEpochInfo.mockReturnValue({
        beaconType: 'date',
        epochDuration: 86400_000,
        epochsToCheck: 1,
      } as any);
      mockGetBeaconHistory.mockReturnValue(['2025-01-15']);
      mockGetBeaconValue.mockResolvedValue('2025-01-15');
    });
  });

  // ---------------------------------------------------------------------------
  // Edge: empty payload frame
  // ---------------------------------------------------------------------------

  it('decodes frame with empty payload', async () => {
    const payload = new Uint8Array(0);
    const frameBytes = await encodeFrame(payload, epochKey, false, 0);
    const bits = frameToBits(frameBytes);

    const result = await tryDecodeMessage(bits, epochKey, 0);

    expect(result).not.toBeNull();
    expect(result!.payload).toHaveLength(0);
  });
});
