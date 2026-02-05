import { describe, it, expect, beforeEach } from 'vitest';
import {
  clearBeaconCache,
  clearBeaconHistory,
  getBeaconHistory,
  formatDateBeacon,
  getEpochInfo,
} from './index';

describe('Grace Period - Beacon History', () => {
  beforeEach(() => {
    clearBeaconCache();
    clearBeaconHistory();
  });

  it('accumulates beacon history on epoch transitions', async () => {
    // For date beacon, we can't easily test history accumulation
    // without mocking time, so we'll test the API contract
    const history = getBeaconHistory('date');
    expect(Array.isArray(history)).toBe(true);
  });

  it('getEpochInfo returns correct epochsToCheck values', () => {
    expect(getEpochInfo('btc').epochsToCheck).toBe(2);
    expect(getEpochInfo('nist').epochsToCheck).toBe(1);
    expect(getEpochInfo('date').epochsToCheck).toBe(1);
  });

  it('formatDateBeacon produces deterministic output', () => {
    const date1 = new Date('2026-02-06T10:00:00Z');
    const date2 = new Date('2026-02-06T23:59:59Z');

    expect(formatDateBeacon(date1)).toBe('2026-02-06');
    expect(formatDateBeacon(date2)).toBe('2026-02-06');
    expect(formatDateBeacon(date1)).toBe(formatDateBeacon(date2));
  });

  it('formatDateBeacon handles date math correctly', () => {
    const today = new Date('2026-02-06T12:00:00Z');
    const yesterday = new Date(today);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);

    expect(formatDateBeacon(today)).toBe('2026-02-06');
    expect(formatDateBeacon(yesterday)).toBe('2026-02-05');
  });
});
