// Tests for ActivityLogContext ring buffer

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ActivityLogProvider, useActivityLog } from './ActivityLogContext';

// Wrapper for hooks
function wrapper({ children }: { children: ReactNode }) {
  return <ActivityLogProvider>{children}</ActivityLogProvider>;
}

describe('ActivityLogContext', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  describe('ring buffer behavior', () => {
    it('starts with empty entries', () => {
      const { result } = renderHook(() => useActivityLog(), { wrapper });
      expect(result.current.entries).toHaveLength(0);
    });

    it('adds entries to the log', () => {
      const { result } = renderHook(() => useActivityLog(), { wrapper });

      act(() => {
        result.current.log({
          category: 'fetch',
          message: 'Test message',
        });
      });

      expect(result.current.entries).toHaveLength(1);
      expect(result.current.entries[0].message).toBe('Test message');
      expect(result.current.entries[0].category).toBe('fetch');
    });

    it('newest entries are first', () => {
      const { result } = renderHook(() => useActivityLog(), { wrapper });

      act(() => {
        result.current.log({ category: 'fetch', message: 'First' });
      });

      vi.advanceTimersByTime(100);

      act(() => {
        result.current.log({ category: 'fetch', message: 'Second' });
      });

      expect(result.current.entries[0].message).toBe('Second');
      expect(result.current.entries[1].message).toBe('First');
    });

    it('enforces maximum entries limit', () => {
      const { result } = renderHook(() => useActivityLog(), { wrapper });

      // Add more than 500 entries
      act(() => {
        for (let i = 0; i < 550; i++) {
          result.current.log({
            category: 'fetch',
            message: `Message ${i}`,
          });
        }
      });

      // Should be capped at 500
      expect(result.current.entries.length).toBeLessThanOrEqual(500);
    });

    it('discards oldest entries when limit reached', () => {
      const { result } = renderHook(() => useActivityLog(), { wrapper });

      act(() => {
        for (let i = 0; i < 510; i++) {
          result.current.log({
            category: 'fetch',
            message: `Message ${i}`,
          });
        }
      });

      // Newest entry (509) should be first
      expect(result.current.entries[0].message).toBe('Message 509');

      // Oldest entries (0-9) should be gone
      const messages = result.current.entries.map(e => e.message);
      expect(messages).not.toContain('Message 0');
      expect(messages).not.toContain('Message 9');
    });
  });

  describe('log levels', () => {
    it('defaults to info level', () => {
      const { result } = renderHook(() => useActivityLog(), { wrapper });

      act(() => {
        result.current.log({
          category: 'fetch',
          message: 'Test',
        });
      });

      expect(result.current.entries[0].level).toBe('info');
    });

    it('respects explicit level', () => {
      const { result } = renderHook(() => useActivityLog(), { wrapper });

      act(() => {
        result.current.log({
          level: 'debug',
          category: 'fetch',
          message: 'Test',
        });
      });

      expect(result.current.entries[0].level).toBe('debug');
    });
  });

  describe('convenience loggers', () => {
    it('info() logs at info level', () => {
      const { result } = renderHook(() => useActivityLog(), { wrapper });

      act(() => {
        result.current.info('fetch', 'Info message');
      });

      expect(result.current.entries[0].level).toBe('info');
      expect(result.current.entries[0].message).toBe('Info message');
    });

    it('detail() logs at detail level', () => {
      const { result } = renderHook(() => useActivityLog(), { wrapper });

      act(() => {
        result.current.detail('signal', 'Detail message');
      });

      expect(result.current.entries[0].level).toBe('detail');
    });

    it('debug() logs at debug level', () => {
      const { result } = renderHook(() => useActivityLog(), { wrapper });

      act(() => {
        result.current.debug('decode', 'Debug message', 'Technical details');
      });

      expect(result.current.entries[0].level).toBe('debug');
      expect(result.current.entries[0].technical).toBe('Technical details');
    });
  });

  describe('clear', () => {
    it('removes all entries', () => {
      const { result } = renderHook(() => useActivityLog(), { wrapper });

      act(() => {
        result.current.log({ category: 'fetch', message: 'Test 1' });
        result.current.log({ category: 'fetch', message: 'Test 2' });
      });

      expect(result.current.entries).toHaveLength(2);

      act(() => {
        result.current.clear();
      });

      expect(result.current.entries).toHaveLength(0);
    });
  });

  describe('entry structure', () => {
    it('generates unique IDs', () => {
      const { result } = renderHook(() => useActivityLog(), { wrapper });

      act(() => {
        result.current.log({ category: 'fetch', message: 'Test 1' });
        result.current.log({ category: 'fetch', message: 'Test 2' });
      });

      expect(result.current.entries[0].id).not.toBe(result.current.entries[1].id);
    });

    it('includes timestamp', () => {
      const { result } = renderHook(() => useActivityLog(), { wrapper });

      const before = Date.now();

      act(() => {
        result.current.log({ category: 'fetch', message: 'Test' });
      });

      const after = Date.now();

      expect(result.current.entries[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(result.current.entries[0].timestamp).toBeLessThanOrEqual(after);
    });

    it('includes optional technical and data fields', () => {
      const { result } = renderHook(() => useActivityLog(), { wrapper });

      act(() => {
        result.current.log({
          category: 'fetch',
          message: 'Test',
          technical: 'Technical info',
          data: { key: 'value' },
        });
      });

      expect(result.current.entries[0].technical).toBe('Technical info');
      expect(result.current.entries[0].data).toEqual({ key: 'value' });
    });
  });
});
