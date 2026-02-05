import { describe, it, expect, beforeEach } from 'vitest';
import { formatDateBeacon, getBeaconHistory, clearBeaconHistory, getEpochInfo } from './index';

// We need to test recordBeaconHistory indirectly through getBeaconHistory
// since recordBeaconHistory is not exported

describe('formatDateBeacon', () => {
  it('formats a date as YYYY-MM-DD UTC', () => {
    const date = new Date('2026-02-05T12:00:00Z');
    expect(formatDateBeacon(date)).toBe('2026-02-05');
  });

  it('handles month/day padding', () => {
    const date = new Date('2026-01-01T00:00:00Z');
    expect(formatDateBeacon(date)).toBe('2026-01-01');
  });

  it('uses UTC (not local time)', () => {
    // 23:30 UTC on Jan 1 should still be Jan 1, not Jan 2
    const date = new Date('2026-01-01T23:30:00Z');
    expect(formatDateBeacon(date)).toBe('2026-01-01');
  });
});

describe('beaconHistory', () => {
  beforeEach(() => {
    clearBeaconHistory();
  });

  it('returns empty array when no history', () => {
    expect(getBeaconHistory('btc')).toEqual([]);
    expect(getBeaconHistory('nist')).toEqual([]);
    expect(getBeaconHistory('date')).toEqual([]);
  });
});
