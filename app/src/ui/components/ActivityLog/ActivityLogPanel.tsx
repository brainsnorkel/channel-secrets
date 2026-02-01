import { useState } from 'react';
import { useTestingMode } from '../../context';
import { useActivityLog } from './ActivityLogContext';
import type { LogCategory, LogEntry } from './types';
import './ActivityLogPanel.css';

/** Category display labels - different for production vs testing mode */
const CATEGORY_LABELS: Record<LogCategory, { production: string; testing: string }> = {
  fetch: { production: 'Sync', testing: 'Fetch' },
  signal: { production: 'Update', testing: 'Signal' },
  decode: { production: 'Received', testing: 'Decode' },
  encode: { production: 'Sent', testing: 'Encode' },
  epoch: { production: 'Time', testing: 'Epoch' },
  error: { production: 'Error', testing: 'Error' },
};

/** Format timestamp for display */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

interface LogEntryRowProps {
  entry: LogEntry;
  testingMode: boolean;
  showTechnical: boolean;
}

function LogEntryRow({ entry, testingMode, showTechnical }: LogEntryRowProps) {
  const [expanded, setExpanded] = useState(false);
  const hasTechnical = !!entry.technical;
  const categoryLabel = CATEGORY_LABELS[entry.category][testingMode ? 'testing' : 'production'];

  // In testing mode or when showTechnical is true, show detail and debug
  const shouldShow = entry.level === 'info' || showTechnical || testingMode;
  if (!shouldShow) return null;

  return (
    <div
      className={`activity-log-entry activity-log-entry-${entry.level} ${expanded ? 'expanded' : ''}`}
      onClick={() => hasTechnical && setExpanded(!expanded)}
      role={hasTechnical ? 'button' : undefined}
      tabIndex={hasTechnical ? 0 : undefined}
      onKeyDown={(e) => {
        if (hasTechnical && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          setExpanded(!expanded);
        }
      }}
    >
      <span className="activity-log-time">{formatTime(entry.timestamp)}</span>
      <span className={`activity-log-category activity-log-category-${entry.category}`}>
        {categoryLabel}
      </span>
      <span className="activity-log-message">
        {entry.message}
        {hasTechnical && !expanded && <span className="activity-log-expand-hint"> ▸</span>}
      </span>
      {expanded && entry.technical && (
        <div className={`activity-log-technical ${testingMode ? 'monospace' : ''}`}>
          {entry.technical}
          {entry.data && testingMode && (
            <pre className="activity-log-data">{JSON.stringify(entry.data, null, 2)}</pre>
          )}
        </div>
      )}
    </div>
  );
}

export interface ActivityLogPanelProps {
  /** Custom class name */
  className?: string;
  /** Maximum height in pixels (default: 300) */
  maxHeight?: number;
}

/**
 * Collapsible activity log panel.
 * Shows app operations with optional technical details.
 */
export function ActivityLogPanel({ className = '', maxHeight = 300 }: ActivityLogPanelProps) {
  const testingMode = useTestingMode();
  const { entries, clear } = useActivityLog();
  const [isCollapsed, setIsCollapsed] = useState(!testingMode);
  const [showTechnical, setShowTechnical] = useState(testingMode);
  const [categoryFilter, setCategoryFilter] = useState<LogCategory | 'all'>('all');

  // Filter entries by category
  const filteredEntries = categoryFilter === 'all'
    ? entries
    : entries.filter(e => e.category === categoryFilter);

  // Count visible entries (respecting level filter)
  const visibleCount = filteredEntries.filter(e =>
    e.level === 'info' || showTechnical || testingMode
  ).length;

  const categories: Array<LogCategory | 'all'> = ['all', 'fetch', 'signal', 'decode', 'encode', 'epoch', 'error'];

  return (
    <div className={`activity-log-panel ${isCollapsed ? 'collapsed' : ''} ${className}`}>
      <div
        className="activity-log-header"
        onClick={() => setIsCollapsed(!isCollapsed)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsCollapsed(!isCollapsed);
          }
        }}
        aria-expanded={!isCollapsed}
      >
        <span className="activity-log-title">
          {testingMode ? 'Activity Log' : 'Activity'}
          <span className="activity-log-count">({visibleCount})</span>
        </span>
        <span className="activity-log-toggle">{isCollapsed ? '▸' : '▾'}</span>
      </div>

      {!isCollapsed && (
        <div className="activity-log-body">
          <div className="activity-log-controls">
            <select
              className="activity-log-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as LogCategory | 'all')}
              aria-label="Filter by category"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All' : CATEGORY_LABELS[cat][testingMode ? 'testing' : 'production']}
                </option>
              ))}
            </select>

            {!testingMode && (
              <label className="activity-log-technical-toggle">
                <input
                  type="checkbox"
                  checked={showTechnical}
                  onChange={(e) => setShowTechnical(e.target.checked)}
                />
                Show technical details
              </label>
            )}

            <button
              type="button"
              className="activity-log-clear"
              onClick={(e) => {
                e.stopPropagation();
                clear();
              }}
              aria-label="Clear log"
            >
              Clear
            </button>
          </div>

          <div className="activity-log-entries" style={{ maxHeight }}>
            {filteredEntries.length === 0 ? (
              <div className="activity-log-empty">No activity yet</div>
            ) : (
              filteredEntries.map(entry => (
                <LogEntryRow
                  key={entry.id}
                  entry={entry}
                  testingMode={testingMode}
                  showTechnical={showTechnical}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
