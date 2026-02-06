import { useEffect, useState } from 'react';
import { getBeaconStatus, type BeaconType, type BeaconStatus } from '../../../core/beacon';
import './BeaconHealthIndicator.css';

export interface BeaconHealthIndicatorProps {
  /** Beacon type to monitor */
  beaconType: BeaconType;
  /** Optional CSS class */
  className?: string;
  /** Refresh interval in milliseconds (default: 30000 = 30s) */
  refreshInterval?: number;
}

/**
 * BeaconHealthIndicator component
 * Shows beacon status: green (live), yellow (using cache), red (failed)
 * Displays beacon type and last successful fetch time
 */
export function BeaconHealthIndicator({
  beaconType,
  className = '',
  refreshInterval = 30000,
}: BeaconHealthIndicatorProps) {
  const [status, setStatus] = useState<BeaconStatus>(() => getBeaconStatus(beaconType));

  useEffect(() => {
    const updateStatus = () => {
      setStatus(getBeaconStatus(beaconType));
    };

    // Update immediately
    updateStatus();

    // Set up periodic refresh
    const intervalId = setInterval(updateStatus, refreshInterval);

    return () => clearInterval(intervalId);
  }, [beaconType, refreshInterval]);

  const statusColor = status.status === 'live' ? 'green' : status.status === 'cached' ? 'yellow' : 'red';
  const statusLabel = status.status === 'live' ? 'Live' : status.status === 'cached' ? 'Cached' : 'Failed';

  const formatTimestamp = (timestamp: number | null): string => {
    if (timestamp === null) return 'Never';
    const date = new Date(timestamp);
    const now = Date.now();
    const diff = now - timestamp;

    // If less than 60 seconds ago, show "Just now"
    if (diff < 60000) return 'Just now';

    // If less than 60 minutes ago, show "X min ago"
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes} min ago`;
    }

    // If less than 24 hours ago, show "X hours ago"
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours}h ago`;
    }

    // Otherwise show full date
    return date.toLocaleString();
  };

  const beaconLabel = beaconType === 'btc' ? 'Bitcoin' : beaconType === 'nist' ? 'NIST' : 'Date';

  return (
    <div className={`beacon-health-indicator ${className}`} role="status" aria-live="polite">
      <div className={`beacon-status-dot beacon-status-${statusColor}`} aria-hidden="true" />
      <div className="beacon-info">
        <span className="beacon-type">{beaconLabel}</span>
        <span className="beacon-status-label">{statusLabel}</span>
        {status.lastFetchTime !== null && (
          <span className="beacon-last-fetch" title={new Date(status.lastFetchTime).toLocaleString()}>
            {formatTimestamp(status.lastFetchTime)}
          </span>
        )}
      </div>
    </div>
  );
}
