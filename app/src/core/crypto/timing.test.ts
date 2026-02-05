import { describe, it, expect, beforeAll } from 'vitest';
import { initSodium, constantTimeLessThan, constantTimeEqual } from './index';

beforeAll(async () => {
  await initSodium();
});

describe('constantTimeLessThan', () => {
  it('returns true when a < b', () => {
    expect(constantTimeLessThan(0n, 1n)).toBe(true);
    expect(constantTimeLessThan(0n, 0xFFFFFFFFFFFFFFFFn)).toBe(true);
    expect(constantTimeLessThan(0xFFFFFFFFFFFFFFFEn, 0xFFFFFFFFFFFFFFFFn)).toBe(true);
  });

  it('returns false when a > b', () => {
    expect(constantTimeLessThan(1n, 0n)).toBe(false);
    expect(constantTimeLessThan(0xFFFFFFFFFFFFFFFFn, 0n)).toBe(false);
    expect(constantTimeLessThan(0x0100000000000001n, 0x0100000000000000n)).toBe(false);
  });

  it('returns false when a === b', () => {
    expect(constantTimeLessThan(0n, 0n)).toBe(false);
    expect(constantTimeLessThan(5n, 5n)).toBe(false);
    expect(constantTimeLessThan(0xFFFFFFFFFFFFFFFFn, 0xFFFFFFFFFFFFFFFFn)).toBe(false);
  });

  it('handles values differing in last byte', () => {
    expect(constantTimeLessThan(0x0100000000000000n, 0x0100000000000001n)).toBe(true);
    expect(constantTimeLessThan(0x0100000000000001n, 0x0100000000000000n)).toBe(false);
  });
});

describe('constantTimeEqual', () => {
  it('returns true for equal arrays', () => {
    const a = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const b = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(constantTimeEqual(a, b)).toBe(true);
  });

  it('returns false for different arrays', () => {
    const a = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const b = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 9]);
    expect(constantTimeEqual(a, b)).toBe(false);
  });

  it('returns true for empty arrays', () => {
    expect(constantTimeEqual(new Uint8Array(0), new Uint8Array(0))).toBe(true);
  });

  it('returns false for different lengths', () => {
    const a = new Uint8Array([1, 2, 3]);
    const b = new Uint8Array([1, 2, 3, 4]);
    expect(constantTimeEqual(a, b)).toBe(false);
  });
});
