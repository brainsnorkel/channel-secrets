// Tests for TestingModeContext and activation logic

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { TestingModeProvider, useTestingMode, setTestingModeStorage } from './TestingModeContext';

// Wrapper for testing mode hooks
function createWrapper(forceValue?: boolean) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <TestingModeProvider forceValue={forceValue}>{children}</TestingModeProvider>
    );
  };
}

describe('TestingModeContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('useTestingMode', () => {
    it('returns true by default when no activation method is set', () => {
      // Default is true: always show full help and assistive features
      const { result } = renderHook(() => useTestingMode(), {
        wrapper: createWrapper(),
      });
      expect(result.current).toBe(true);
    });

    it('returns true when forceValue is true', () => {
      const { result } = renderHook(() => useTestingMode(), {
        wrapper: createWrapper(true),
      });
      expect(result.current).toBe(true);
    });

    it('returns false when forceValue is false', () => {
      const { result } = renderHook(() => useTestingMode(), {
        wrapper: createWrapper(false),
      });
      expect(result.current).toBe(false);
    });

    it('returns true when localStorage has stego_testing_mode=true', () => {
      localStorage.setItem('stego_testing_mode', 'true');
      const { result } = renderHook(() => useTestingMode(), {
        wrapper: createWrapper(),
      });
      expect(result.current).toBe(true);
    });
  });

  describe('setTestingModeStorage', () => {
    it('sets localStorage value when enabled', () => {
      setTestingModeStorage(true);
      expect(localStorage.getItem('stego_testing_mode')).toBe('true');
    });

    it('removes localStorage value when disabled', () => {
      localStorage.setItem('stego_testing_mode', 'true');
      setTestingModeStorage(false);
      expect(localStorage.getItem('stego_testing_mode')).toBeNull();
    });

    it('overwrites existing localStorage value', () => {
      setTestingModeStorage(false);
      setTestingModeStorage(true);
      expect(localStorage.getItem('stego_testing_mode')).toBe('true');
    });
  });

  describe('activation precedence', () => {
    it('localStorage activates testing mode when no URL param', () => {
      localStorage.setItem('stego_testing_mode', 'true');
      const { result } = renderHook(() => useTestingMode(), {
        wrapper: createWrapper(),
      });
      expect(result.current).toBe(true);
    });

    it('forceValue overrides localStorage', () => {
      localStorage.setItem('stego_testing_mode', 'true');
      const { result } = renderHook(() => useTestingMode(), {
        wrapper: createWrapper(false),
      });
      expect(result.current).toBe(false);
    });
  });
});
