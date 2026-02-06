import { useEffect, useState } from 'react';
import type { BeaconType } from '../../../core/beacon';
import { getEpochInfo } from '../../../core/beacon';
import './EpochBoundaryWarning.css';

export interface EpochBoundaryWarningProps {
  beaconType: BeaconType;
  epochExpiresAt: number; // Unix timestamp
}

/**
 * Pre-transmission warning displayed in the compose area when the
 * epoch boundary is within the grace period. Alerts users that a
 * transmission started now may span two epochs.
 */
export function EpochBoundaryWarning({
  beaconType,
  epochExpiresAt,
}: EpochBoundaryWarningProps) {
  const [epochTimeLeft, setEpochTimeLeft] = useState<number>(0);

  const { gracePeriod } = getEpochInfo(beaconType);
  const gracePeriodMs = gracePeriod * 1000;

  useEffect(() => {
    const update = () => {
      const remaining = Math.max(0, epochExpiresAt - Date.now());
      setEpochTimeLeft(remaining);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [epochExpiresAt]);

  const withinGracePeriod = epochTimeLeft > 0 && epochTimeLeft <= gracePeriodMs;

  if (!withinGracePeriod) {
    return null;
  }

  return (
    <div className="epoch-boundary-warning">
      <span className="epoch-boundary-warning__icon">⚠</span>
      <div className="epoch-boundary-warning__content">
        <p className="epoch-boundary-warning__title">Epoch boundary approaching</p>
        <p className="epoch-boundary-warning__detail">
          Transmission may span two epochs. Posts near the boundary use grace
          period ({gracePeriod}s for {beaconType}).
        </p>
      </div>
    </div>
  );
}
