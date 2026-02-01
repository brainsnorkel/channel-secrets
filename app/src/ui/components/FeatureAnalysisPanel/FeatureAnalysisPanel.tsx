import { useState, useMemo } from 'react';
import { useTestingMode } from '../../context';
import { Tooltip } from '../Tooltip';
import {
  normalizeText,
  countGraphemes,
  extractLengthBit,
  extractMediaBit,
  extractQuestionBit,
  extractFirstWordBits,
} from '../../../core/protocol/features';
import './FeatureAnalysisPanel.css';

/** First word category labels */
const FIRST_WORD_CATEGORIES = ['Pronoun', 'Article', 'Verb', 'Other'] as const;

export interface FeatureAnalysisPanelProps {
  /** Post text content */
  text: string;
  /** Whether post has media attached */
  hasMedia: boolean;
  /** Required bits for a match (optional) */
  requiredBits?: number;
  /** Length threshold (default: 50) */
  lengthThreshold?: number;
  /** Whether the panel is expanded */
  expanded?: boolean;
  /** Callback when expansion changes */
  onExpandedChange?: (expanded: boolean) => void;
  /** Whether this is a signal post */
  isSignalPost?: boolean;
  /** Custom class name */
  className?: string;
}

interface FeatureDetail {
  name: string;
  value: string;
  bit: number;
  description: string;
  tooltipId: 'feature-length' | 'feature-media' | 'feature-firstchar';
}

interface SmartTip {
  action: string;
  targetBit: number;
}

/**
 * Calculate smart tips for achieving a target bit pattern
 */
function calculateSmartTips(
  currentBits: number,
  requiredBits: number,
  charCount: number,
  lengthThreshold: number,
  _hasMedia: boolean,
  _hasQuestion: boolean
): SmartTip[] {
  const tips: SmartTip[] = [];

  // Check each bit position
  // Bit 2 (MSB): length
  const currentLen = (currentBits >> 2) & 1;
  const requiredLen = (requiredBits >> 2) & 1;
  if (currentLen !== requiredLen) {
    if (requiredLen === 1) {
      const charsNeeded = lengthThreshold - charCount;
      tips.push({ action: `Add ${charsNeeded}+ characters`, targetBit: 2 });
    } else {
      const charsToRemove = charCount - lengthThreshold + 1;
      tips.push({ action: `Remove ${charsToRemove}+ characters`, targetBit: 2 });
    }
  }

  // Bit 1: media
  const currentMedia = (currentBits >> 1) & 1;
  const requiredMedia = (requiredBits >> 1) & 1;
  if (currentMedia !== requiredMedia) {
    if (requiredMedia === 1) {
      tips.push({ action: 'Add an image or media', targetBit: 1 });
    } else {
      tips.push({ action: 'Remove the media attachment', targetBit: 1 });
    }
  }

  // Bit 0 (LSB): question mark
  const currentQ = currentBits & 1;
  const requiredQ = requiredBits & 1;
  if (currentQ !== requiredQ) {
    if (requiredQ === 1) {
      tips.push({ action: 'Add a question mark (?)', targetBit: 0 });
    } else {
      tips.push({ action: 'Remove the question mark', targetBit: 0 });
    }
  }

  return tips;
}

/**
 * Feature Analysis Panel for composition assistant.
 * Shows real-time feature breakdown and match status.
 */
export function FeatureAnalysisPanel({
  text,
  hasMedia,
  requiredBits,
  lengthThreshold = 50,
  expanded: controlledExpanded,
  onExpandedChange,
  isSignalPost: _isSignalPost,
  className = '',
}: FeatureAnalysisPanelProps) {
  const testingMode = useTestingMode();
  const [internalExpanded, setInternalExpanded] = useState(testingMode);

  // Use controlled or internal state
  const expanded = controlledExpanded ?? internalExpanded;
  const setExpanded = onExpandedChange ?? setInternalExpanded;

  // Calculate all features
  const analysis = useMemo(() => {
    const normalized = normalizeText(text);
    const charCount = countGraphemes(normalized);
    const lengthBit = extractLengthBit(text, lengthThreshold);
    const mediaBit = extractMediaBit(hasMedia);
    const questionBit = extractQuestionBit(text);
    const firstWordBits = extractFirstWordBits(text);

    // Combine into 3-bit value (using length, media, question for now)
    const encodedBits = (lengthBit << 2) | (mediaBit << 1) | questionBit;

    const features: FeatureDetail[] = [
      {
        name: 'Length',
        value: `${charCount} chars`,
        bit: lengthBit,
        description: charCount >= lengthThreshold
          ? `≥${lengthThreshold} → 1`
          : `<${lengthThreshold} → 0`,
        tooltipId: 'feature-length',
      },
      {
        name: 'Media',
        value: hasMedia ? 'attached' : 'none',
        bit: mediaBit,
        description: hasMedia ? 'has media → 1' : 'no media → 0',
        tooltipId: 'feature-media',
      },
      {
        name: 'Question',
        value: text.includes('?') ? 'yes' : 'no',
        bit: questionBit,
        description: text.includes('?') ? 'has ? → 1' : 'no ? → 0',
        tooltipId: 'feature-firstchar',
      },
    ];

    const isMatch = requiredBits !== undefined && encodedBits === requiredBits;
    const smartTips = requiredBits !== undefined && !isMatch
      ? calculateSmartTips(encodedBits, requiredBits, charCount, lengthThreshold, hasMedia, text.includes('?'))
      : [];

    return {
      charCount,
      features,
      encodedBits,
      firstWordCategory: FIRST_WORD_CATEGORIES[firstWordBits],
      isMatch,
      smartTips,
    };
  }, [text, hasMedia, lengthThreshold, requiredBits]);

  // In testing mode, always show expanded
  const showExpanded = testingMode || expanded;

  // Don't collapse header click in testing mode
  const handleHeaderClick = () => {
    if (!testingMode) {
      setExpanded(!expanded);
    }
  };

  return (
    <div
      className={`feature-analysis-panel ${showExpanded ? 'expanded' : 'collapsed'} ${className}`}
      data-testing-mode={testingMode}
    >
      <div
        className="feature-analysis-header"
        onClick={handleHeaderClick}
        role={testingMode ? undefined : 'button'}
        tabIndex={testingMode ? undefined : 0}
        onKeyDown={(e) => {
          if (!testingMode && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setExpanded(!expanded);
          }
        }}
      >
        <span className="feature-analysis-title">
          <Tooltip id="feature-bits">
            <span>{testingMode ? 'Feature Analysis' : 'Post Analysis'}</span>
          </Tooltip>
        </span>

        <span className="feature-analysis-summary">
          <span className="feature-analysis-bits">
            0b{analysis.encodedBits.toString(2).padStart(3, '0')}
          </span>
          {requiredBits !== undefined && (
            <span className={`feature-analysis-match ${analysis.isMatch ? 'match' : 'no-match'}`}>
              {analysis.isMatch ? '✓ Match' : '✗ No match'}
            </span>
          )}
        </span>

        {!testingMode && (
          <span className="feature-analysis-toggle">{expanded ? '▾' : '▸'}</span>
        )}
      </div>

      {showExpanded && (
        <div className="feature-analysis-body">
          <div className="feature-analysis-features">
            {analysis.features.map((feature) => (
              <div key={feature.name} className="feature-analysis-row">
                <Tooltip id={feature.tooltipId}>
                  <span className="feature-analysis-name">{feature.name}:</span>
                </Tooltip>
                <span className="feature-analysis-value">{feature.value}</span>
                <span className="feature-analysis-arrow">→</span>
                <span className={`feature-analysis-bit bit-${feature.bit}`}>
                  {feature.bit}
                </span>
                <span className="feature-analysis-description">
                  ({feature.description})
                </span>
              </div>
            ))}
          </div>

          <div className="feature-analysis-encoded">
            <span className="feature-analysis-label">Encodes:</span>
            <code className="feature-analysis-code">
              0b{analysis.encodedBits.toString(2).padStart(3, '0')}
            </code>
            {requiredBits !== undefined && (
              <>
                <span className="feature-analysis-label">Need:</span>
                <code className="feature-analysis-code">
                  0b{requiredBits.toString(2).padStart(3, '0')}
                </code>
              </>
            )}
          </div>

          {analysis.smartTips.length > 0 && (
            <div className="feature-analysis-tips">
              <span className="feature-analysis-tips-label">💡 Tips:</span>
              <ul className="feature-analysis-tips-list">
                {analysis.smartTips.map((tip, i) => (
                  <li key={i}>{tip.action}</li>
                ))}
              </ul>
            </div>
          )}

          {testingMode && (
            <div className="feature-analysis-spec-ref">
              See SPEC.md §7.1-7.5
            </div>
          )}
        </div>
      )}
    </div>
  );
}
