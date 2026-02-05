// Module: test/beacon-helpers
// Beacon mock helpers for vitest

import { vi } from 'vitest';

/**
 * Create a vi.mock factory for the beacon module.
 * Returns a mock object that can be passed to vi.mock().
 *
 * Usage in tests:
 * ```
 * vi.mock('../core/beacon', () => createBeaconMock());
 * ```
 *
 * @param overrides - Optional overrides for default mock behavior
 * @returns Mock factory object for vi.mock()
 */
export function createBeaconMock(overrides?: {
  beaconValue?: string;
  beaconType?: 'date' | 'btc' | 'nist';
  epochDuration?: number;
  epochsToCheck?: number;
  beaconHistory?: string[];
}) {
  const {
    beaconValue = '2025-01-15',
    beaconType = 'date',
    epochDuration = 86400_000,
    epochsToCheck = 1,
    beaconHistory = ['2025-01-15'],
  } = overrides ?? {};

  return {
    getBeaconValue: vi.fn().mockResolvedValue(beaconValue),
    getEpochInfo: vi.fn().mockReturnValue({
      beaconType,
      epochDuration,
      epochsToCheck,
    }),
    getBeaconHistory: vi.fn().mockReturnValue(beaconHistory),
    formatDateBeacon: vi.fn().mockImplementation((date: Date) => {
      return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
    }),
    clearBeaconCache: vi.fn(),
    clearBeaconHistory: vi.fn(),
  };
}
