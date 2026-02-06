import React, { useState, useEffect } from 'react';
import { analyzePostFeatures, suggestModifications } from '../../../core/sender';
import type { PostFeaturesAnalysis, ModificationSuggestion } from '../../../core/sender';
import './ComposeBox.css';

export interface ComposeBoxProps {
  channelId?: string;
  requiredBits?: number[] | null;
  onPublish: (text: string, hasMedia: boolean) => void;
  disabled?: boolean;
}

export const ComposeBox: React.FC<ComposeBoxProps> = ({
  channelId,
  requiredBits,
  onPublish,
  disabled = false,
}) => {
  const [text, setText] = useState('');
  const [hasMedia, setHasMedia] = useState(false);
  const [features, setFeatures] = useState<PostFeaturesAnalysis>({
    len: 0,
    media: 0,
    qmark: 0,
    extractedBits: [0, 0, 0],
  });

  // Update feature analysis whenever text or hasMedia changes
  useEffect(() => {
    const analysis = analyzePostFeatures(text, hasMedia);
    setFeatures(analysis);
  }, [text, hasMedia]);

  // Check if bits match required bits
  const isTransmitting = !!channelId && requiredBits !== null && requiredBits !== undefined && requiredBits.length > 0;
  const bitsMatch = isTransmitting && requiredBits
    ? features.extractedBits.slice(0, requiredBits.length).every((bit, i) => bit === requiredBits[i])
    : false;

  // Get suggestions when bits don't match
  const suggestions: ModificationSuggestion[] = isTransmitting && !bitsMatch && requiredBits
    ? suggestModifications(features.extractedBits, requiredBits)
    : [];

  const handlePublish = () => {
    if (text.trim()) {
      onPublish(text, hasMedia);
      setText('');
      setHasMedia(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handlePublish();
    }
  };

  return (
    <div className="compose-box" data-testid="compose-box">
      <div className="compose-area">
        <textarea
          className="compose-textarea"
          data-testid="compose-input"
          placeholder="What's happening?"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={4}
        />

        <div className="compose-controls">
          <button
            className={`media-toggle ${hasMedia ? 'active' : ''}`}
            onClick={() => setHasMedia(!hasMedia)}
            disabled={disabled}
            type="button"
          >
            {hasMedia ? '🖼️ Remove Image': '🖼️ Add Image'}
          </button>

          <button
            className="publish-button"
            data-testid="compose-publish"
            onClick={handlePublish}
            disabled={disabled || !text.trim()}
            type="button"
          >
            Publish
          </button>
        </div>
      </div>

      <div className="analysis-panel">
        {/* Feature display */}
        <div className="feature-display" data-testid="compose-features">
          <h3>Your post encodes:</h3>
          <div className="bits-display">
            <div className={`bit-item ${getBitClass('len', features.len, requiredBits, isTransmitting)}`}>
              <span className="bit-label">len</span>
              <span className="bit-value">[{features.len}]</span>
            </div>
            <div className={`bit-item ${getBitClass('media', features.media, requiredBits, isTransmitting)}`}>
              <span className="bit-label">media</span>
              <span className="bit-value">[{features.media}]</span>
            </div>
            <div className={`bit-item ${getBitClass('qmark', features.qmark, requiredBits, isTransmitting)}`}>
              <span className="bit-label">qmark</span>
              <span className="bit-value">[{features.qmark}]</span>
            </div>
          </div>
        </div>

        {/* Required bits display (only when transmitting) */}
        {isTransmitting && requiredBits && (
          <div className="required-display">
            <h3>Required bits:</h3>
            <div className="bits-display">
              {requiredBits.map((bit, i) => (
                <div key={i} className="bit-item required">
                  <span className="bit-label">{['len', 'media', 'qmark'][i]}</span>
                  <span className="bit-value">[{bit}]</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Match/mismatch indicator */}
        {!isTransmitting && (
          <div className="status-box status-neutral">
            <span className="status-icon">○</span>
            <span className="status-text">No active transmission. This will be a normal post.</span>
          </div>
        )}

        {isTransmitting && bitsMatch && (
          <div className="status-box status-match">
            <span className="status-icon">✓</span>
            <span className="status-text">
              MATCHES! This post will advance your message IF it becomes a signal post.
            </span>
          </div>
        )}

        {isTransmitting && !bitsMatch && (
          <div className="status-box status-mismatch">
            <span className="status-icon">✗</span>
            <span className="status-text">
              Doesn't match required bits. Will be cover traffic.
            </span>
          </div>
        )}

        {/* Suggestions when bits don't match */}
        {suggestions.length > 0 && (
          <div className="suggestions-panel">
            <h4>Suggestions to match:</h4>
            <ul>
              {suggestions.map((suggestion, i) => (
                <li key={i}>{suggestion.suggestion}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Help text */}
        <div className="help-text">
          <small>
            {isTransmitting
              ? 'Signal vs. cover is determined by post ID (rkey) after publishing.'
              : 'Queue a message to start transmitting.'
            }
          </small>
        </div>
      </div>
    </div>
  );
};

// Helper function to determine bit item CSS class
function getBitClass(
  featureName: string,
  featureValue: number,
  requiredBits: number[] | null | undefined,
  isTransmitting: boolean
): string {
  if (!isTransmitting || !requiredBits) {
    return 'neutral';
  }

  const featureIndex = ['len', 'media', 'qmark'].indexOf(featureName);
  if (featureIndex === -1 || featureIndex >= requiredBits.length) {
    return 'neutral';
  }

  const requiredValue = requiredBits[featureIndex];
  return featureValue === requiredValue ? 'match' : 'mismatch';
}
