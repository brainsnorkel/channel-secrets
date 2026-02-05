// Vitest test setup
// This file is loaded before each test file

import 'fake-indexeddb/auto';
import '@testing-library/react';
import { beforeAll, afterEach } from 'vitest';
import { initSodium } from '../core/crypto';
import { resetState } from '../state';
import { clearBeaconCache, clearBeaconHistory } from '../core/beacon';
import { clearAllSeqNums } from '../core/protocol/seqnum';

// Mock localStorage for jsdom environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Export test configuration constants
export const TEST_ARGON2ID_PARAMS = { opsLimit: 1, memLimit: 8192 };

// Initialize libsodium before all tests
beforeAll(async () => {
  await initSodium();
});

// Clean up after each test
afterEach(() => {
  localStorageMock.clear();
  resetState();
  clearBeaconCache();
  clearBeaconHistory();
  clearAllSeqNums();
});
