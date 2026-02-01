/**
 * Activity log types for self-documenting UI.
 * Provides structured logging of app operations with detail levels.
 */

/** Log severity/detail levels */
export type LogLevel = 'info' | 'detail' | 'debug';

/** Log event categories */
export type LogCategory =
  | 'fetch'   // Feed fetch operations
  | 'signal'  // Signal post detection
  | 'decode'  // Message decoding/receiving
  | 'encode'  // Message encoding/sending
  | 'epoch'   // Epoch transitions
  | 'error';  // Errors and warnings

/** A single log entry */
export interface LogEntry {
  /** Unique identifier for the entry */
  id: string;
  /** Unix timestamp in milliseconds */
  timestamp: number;
  /** Severity/detail level */
  level: LogLevel;
  /** Event category */
  category: LogCategory;
  /** Human-readable summary message */
  message: string;
  /** Optional technical details (shown on expand or in testing mode) */
  technical?: string;
  /** Optional structured data for inspection */
  data?: Record<string, unknown>;
}

/** Options for creating a log entry */
export interface LogEntryOptions {
  level?: LogLevel;
  category: LogCategory;
  message: string;
  technical?: string;
  data?: Record<string, unknown>;
}
