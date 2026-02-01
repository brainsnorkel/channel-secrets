import { createContext, useContext, useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import type { LogEntry, LogEntryOptions, LogCategory } from './types';

/** Maximum number of log entries to keep in the ring buffer */
const MAX_ENTRIES = 500;

/** Generate unique ID for log entries */
let entryIdCounter = 0;
function generateId(): string {
  return `log-${Date.now()}-${++entryIdCounter}`;
}

/** Context value type */
interface ActivityLogContextValue {
  /** All log entries (newest first) */
  entries: LogEntry[];
  /** Add a new log entry */
  log: (options: LogEntryOptions) => void;
  /** Clear all entries */
  clear: () => void;
  /** Convenience loggers by level */
  info: (category: LogCategory, message: string, technical?: string, data?: Record<string, unknown>) => void;
  detail: (category: LogCategory, message: string, technical?: string, data?: Record<string, unknown>) => void;
  debug: (category: LogCategory, message: string, technical?: string, data?: Record<string, unknown>) => void;
}

const ActivityLogContext = createContext<ActivityLogContextValue | null>(null);

/**
 * Hook to access the activity log.
 * Must be used within an ActivityLogProvider.
 */
export function useActivityLog(): ActivityLogContextValue {
  const context = useContext(ActivityLogContext);
  if (!context) {
    throw new Error('useActivityLog must be used within an ActivityLogProvider');
  }
  return context;
}

/**
 * Hook that returns just the log function, safe to use anywhere.
 * Returns a no-op if not within a provider.
 */
export function useLog(): ActivityLogContextValue['log'] {
  const context = useContext(ActivityLogContext);
  if (!context) {
    // Return no-op if no provider
    return () => {};
  }
  return context.log;
}

interface ActivityLogProviderProps {
  children: ReactNode;
}

/**
 * Provider for activity log state.
 * Implements a ring buffer that discards oldest entries when full.
 */
export function ActivityLogProvider({ children }: ActivityLogProviderProps) {
  const [entries, setEntries] = useState<LogEntry[]>([]);

  const log = useCallback((options: LogEntryOptions) => {
    const entry: LogEntry = {
      id: generateId(),
      timestamp: Date.now(),
      level: options.level ?? 'info',
      category: options.category,
      message: options.message,
      technical: options.technical,
      data: options.data,
    };

    setEntries(prev => {
      // Add new entry at the beginning (newest first)
      const updated = [entry, ...prev];
      // Enforce ring buffer limit
      if (updated.length > MAX_ENTRIES) {
        return updated.slice(0, MAX_ENTRIES);
      }
      return updated;
    });
  }, []);

  const clear = useCallback(() => {
    setEntries([]);
  }, []);

  // Convenience loggers
  const info = useCallback(
    (category: LogCategory, message: string, technical?: string, data?: Record<string, unknown>) => {
      log({ level: 'info', category, message, technical, data });
    },
    [log]
  );

  const detail = useCallback(
    (category: LogCategory, message: string, technical?: string, data?: Record<string, unknown>) => {
      log({ level: 'detail', category, message, technical, data });
    },
    [log]
  );

  const debug = useCallback(
    (category: LogCategory, message: string, technical?: string, data?: Record<string, unknown>) => {
      log({ level: 'debug', category, message, technical, data });
    },
    [log]
  );

  const value: ActivityLogContextValue = {
    entries,
    log,
    clear,
    info,
    detail,
    debug,
  };

  return (
    <ActivityLogContext.Provider value={value}>
      {children}
    </ActivityLogContext.Provider>
  );
}
