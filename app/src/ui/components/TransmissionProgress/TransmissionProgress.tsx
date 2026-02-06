import { useEffect, useState } from 'react';
import type { BeaconType } from '../../../core/beacon';
import { getEpochInfo } from '../../../core/beacon';
import './TransmissionProgress.css';

export interface TransmissionProgressProps {
  contactName: string;
  messagePreview: string;
  bitsTotal: number;
  bitsSent: number;
  signalPostsUsed: number;
  epochId: string;
  epochExpiresAt: number;  // Unix timestamp
  startedAt: number;  // Unix timestamp
  beaconType: BeaconType;
  onCancel: () => void;
  isComplete?: boolean;
}

export function TransmissionProgress({
  contactName,
  messagePreview,
  bitsTotal,
  bitsSent,
  signalPostsUsed,
  epochId,
  epochExpiresAt,
  startedAt,
  beaconType,
  onCancel,
  isComplete = false,
}: TransmissionProgressProps) {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [epochTimeLeft, setEpochTimeLeft] = useState<number>(0);

  // Derive beacon-aware thresholds
  const { gracePeriod } = getEpochInfo(beaconType);
  const gracePeriodMs = gracePeriod * 1000;
  const APPROACH_WARNING_MS = 60_000;
  const approachThreshold = Math.min(APPROACH_WARNING_MS, gracePeriodMs);

  // Update epoch time remaining
  useEffect(() => {
    const updateEpochTime = () => {
      const now = Date.now();
      const remaining = Math.max(0, epochExpiresAt - now);
      setEpochTimeLeft(remaining);
    };

    updateEpochTime();
    const interval = setInterval(updateEpochTime, 1000);
    return () => clearInterval(interval);
  }, [epochExpiresAt]);

  // Calculate estimated time remaining
  useEffect(() => {
    if (bitsSent === 0 || isComplete) {
      setTimeRemaining(null);
      return;
    }

    const now = Date.now();
    const elapsed = (now - startedAt) / 1000; // seconds
    const bitsPerSecond = bitsSent / elapsed;
    const bitsRemaining = bitsTotal - bitsSent;
    const secondsRemaining = bitsRemaining / bitsPerSecond;

    setTimeRemaining(secondsRemaining);
  }, [bitsSent, bitsTotal, startedAt, isComplete]);

  const percentage = bitsTotal > 0 ? Math.round((bitsSent / bitsTotal) * 100) : 0;
  const truncatedMessage = messagePreview.length > 60
    ? messagePreview.substring(0, 60) + '...'
    : messagePreview;

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
    return `${Math.round(seconds / 86400)}d`;
  };

  const handleCancel = () => {
    if (showCancelConfirm) {
      onCancel();
      setShowCancelConfirm(false);
    } else {
      setShowCancelConfirm(true);
    }
  };

  const epochApproaching = epochTimeLeft > 0 && epochTimeLeft < approachThreshold;
  const graceActive = epochTimeLeft > 0 && epochTimeLeft <= gracePeriodMs;

  if (isComplete) {
    return (
      <div className="transmission-progress transmission-progress--complete" data-testid="transmission-complete">
        <div className="transmission-progress__celebration">
          <div className="transmission-progress__check-icon">✓</div>
          <h3 className="transmission-progress__complete-title">Message sent!</h3>
          <p className="transmission-progress__complete-details">
            Sent to {contactName} • {bitsTotal} bits in {signalPostsUsed} signal posts
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="transmission-progress" data-testid="transmission-progress">
      <div className="transmission-progress__header">
        <h3 className="transmission-progress__title">Sending to: {contactName}</h3>
        <p className="transmission-progress__message">{truncatedMessage}</p>
      </div>

      <div className="transmission-progress__bar-container">
        <div className="transmission-progress__bar" data-testid="transmission-bar">
          <div
            className="transmission-progress__bar-fill"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="transmission-progress__percentage" data-testid="transmission-percentage">{percentage}%</div>
      </div>

      <div className="transmission-progress__stats">
        <div className="transmission-progress__stat">
          <span className="transmission-progress__stat-label">Bits sent:</span>
          <span className="transmission-progress__stat-value">{bitsSent} / {bitsTotal}</span>
        </div>
        <div className="transmission-progress__stat">
          <span className="transmission-progress__stat-label">Signal posts used:</span>
          <span className="transmission-progress__stat-value">{signalPostsUsed}</span>
        </div>
        {timeRemaining !== null && (
          <div className="transmission-progress__stat">
            <span className="transmission-progress__stat-label">Est. time remaining:</span>
            <span className="transmission-progress__stat-value">{formatTime(timeRemaining)}</span>
          </div>
        )}
        <div className="transmission-progress__stat">
          <span className="transmission-progress__stat-label">Grace period:</span>
          <span className="transmission-progress__stat-value">{gracePeriod}s ({beaconType})</span>
        </div>
      </div>

      <div className={`transmission-progress__epoch ${epochApproaching ? 'transmission-progress__epoch--warning' : ''}`}>
        <div className="transmission-progress__epoch-id">
          <span className="transmission-progress__epoch-label">Current epoch:</span>
          <span className="transmission-progress__epoch-value">{epochId}</span>
        </div>
        <div className="transmission-progress__epoch-timer" data-testid="transmission-epoch-timer">
          {epochApproaching && (
            <span className="transmission-progress__epoch-warning-icon">⚠</span>
          )}
          <span className="transmission-progress__epoch-label">Expires in:</span>
          <span className="transmission-progress__epoch-value">{formatTime(epochTimeLeft / 1000)}</span>
        </div>
      </div>

      {graceActive && (
        <div className="transmission-progress__grace transmission-progress__grace--active" data-testid="transmission-grace-active">
          <span className="transmission-progress__grace-icon">⏳</span>
          <span className="transmission-progress__grace-text">
            Grace period active ({formatTime(epochTimeLeft / 1000)} remaining)
          </span>
        </div>
      )}

      <div className="transmission-progress__actions">
        {showCancelConfirm ? (
          <div className="transmission-progress__cancel-confirm">
            <p className="transmission-progress__cancel-message">
              Cancel sending message? Progress will be lost.
            </p>
            <div className="transmission-progress__cancel-buttons">
              <button
                className="transmission-progress__button transmission-progress__button--danger"
                onClick={handleCancel}
              >
                Yes, Cancel
              </button>
              <button
                className="transmission-progress__button transmission-progress__button--secondary"
                onClick={() => setShowCancelConfirm(false)}
              >
                No, Continue
              </button>
            </div>
          </div>
        ) : (
          <button
            className="transmission-progress__button transmission-progress__button--cancel"
            data-testid="transmission-cancel"
            onClick={handleCancel}
          >
            Cancel Transmission
          </button>
        )}
      </div>
    </div>
  );
}
