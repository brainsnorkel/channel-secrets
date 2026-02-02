import { useState, useEffect } from 'react';
import './FeatureBitsDisplay.css';

export interface FeatureBitsDisplayProps {
  /** The feature bits to display [len, media, qmark] */
  bits: number[];
  /** Optional target bits for comparison */
  targetBits?: number[] | null;
  /** Custom labels for each bit (default: ['len', 'media', 'qmark']) */
  labels?: string[];
  /** Compact mode (just boxes, no labels) */
  compact?: boolean;
  /** Show "Got: X, Need: Y" when mismatch */
  showDiff?: boolean;
}

const DEFAULT_LABELS = ['len', 'media', 'qmark'];
const DEFAULT_TOOLTIPS = [
  'Post length (1 = above median, 0 = below)',
  'Has media (1 = yes, 0 = no)',
  'Contains question mark (1 = yes, 0 = no)',
];

/**
 * Visual bit indicator component for feature bits.
 * Shows [len] [media] [qmark] with color coding based on target match.
 */
export function FeatureBitsDisplay({
  bits,
  targetBits,
  labels = DEFAULT_LABELS,
  compact = false,
  showDiff = false,
}: FeatureBitsDisplayProps) {
  const [animatingIndex, setAnimatingIndex] = useState<number | null>(null);
  const [prevBits, setPrevBits] = useState<number[]>(bits);

  // Detect bit changes and trigger animation
  useEffect(() => {
    for (let i = 0; i < bits.length; i++) {
      if (bits[i] !== prevBits[i]) {
        setAnimatingIndex(i);
        const timer = setTimeout(() => setAnimatingIndex(null), 600);
        setPrevBits(bits);
        return () => clearTimeout(timer);
      }
    }
  }, [bits, prevBits]);

  const getBitStatus = (index: number): 'match' | 'mismatch' | 'neutral' => {
    if (!targetBits || targetBits.length === 0) {
      return 'neutral';
    }
    return bits[index] === targetBits[index] ? 'match' : 'mismatch';
  };

  const hasAnyTarget = targetBits && targetBits.length > 0;
  const allMatch = hasAnyTarget && bits.every((bit, i) => bit === targetBits[i]);

  return (
    <div className={`feature-bits-display ${compact ? 'compact' : ''}`}>
      <div className="feature-bits-container">
        {bits.map((bit, index) => {
          const status = getBitStatus(index);
          const isAnimating = animatingIndex === index;
          const tooltip = DEFAULT_TOOLTIPS[index] || '';

          return (
            <div
              key={index}
              className={`feature-bit ${status} ${isAnimating ? 'animating' : ''}`}
              title={tooltip}
            >
              <div className="feature-bit-value">{bit}</div>
              {!compact && (
                <div className="feature-bit-label">{labels[index]}</div>
              )}
            </div>
          );
        })}
      </div>

      {showDiff && hasAnyTarget && !allMatch && (
        <div className="feature-bits-diff">
          <span className="diff-label">Got:</span>{' '}
          <span className="diff-value">{bits.join('')}</span>
          {' • '}
          <span className="diff-label">Need:</span>{' '}
          <span className="diff-value">{targetBits.join('')}</span>
        </div>
      )}

      {hasAnyTarget && allMatch && (
        <div className="feature-bits-match-indicator">
          ✓ Match
        </div>
      )}
    </div>
  );
}
