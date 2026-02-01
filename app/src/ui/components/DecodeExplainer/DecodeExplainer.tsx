// Module: ui/components/DecodeExplainer
// Expandable component showing how a message was decoded

import { useState } from 'react';
import { useTestingMode } from '../../context';
import type { MessageWithProvenance, ContributingPost } from './types';
import './DecodeExplainer.css';

export interface DecodeExplainerProps {
  /** Message with provenance information */
  message: MessageWithProvenance;
  /** Whether to show timeline visualization */
  showTimeline?: boolean;
  /** Custom class name */
  className?: string;
}

/**
 * Format bits array as binary string
 */
function formatBits(bits: number[]): string {
  return `0b${bits.join('')}`;
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Truncate text with ellipsis
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + '…';
}

/**
 * Single contributing post row
 */
function PostRow({ post, testingMode }: { post: ContributingPost; testingMode: boolean }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`decode-post ${expanded ? 'expanded' : ''}`}>
      <button
        type="button"
        className="decode-post-header"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <span className="decode-post-time">{formatDate(post.timestamp)}</span>
        <span className="decode-post-bits">{formatBits(post.extractedBits)}</span>
        <span className="decode-post-preview">{truncate(post.contentPreview, 40)}</span>
        <span className="decode-post-toggle">{expanded ? '▼' : '▶'}</span>
      </button>

      {expanded && (
        <div className="decode-post-details">
          <div className="decode-post-source">
            {post.source}: {post.sourceId}
          </div>
          <div className="decode-post-features">
            <div className="decode-feature">
              <span className="decode-feature-name">Length</span>
              <span className="decode-feature-value">
                {post.features.length.value} chars
                {testingMode && ` (threshold: ${post.features.length.threshold})`}
              </span>
              <span className="decode-feature-bit">→ {post.features.length.bit}</span>
            </div>
            <div className="decode-feature">
              <span className="decode-feature-name">Media</span>
              <span className="decode-feature-value">
                {post.features.hasMedia.value ? 'Yes' : 'No'}
              </span>
              <span className="decode-feature-bit">→ {post.features.hasMedia.bit}</span>
            </div>
            <div className="decode-feature">
              <span className="decode-feature-name">Question</span>
              <span className="decode-feature-value">
                {post.features.hasQuestion.value ? 'Yes' : 'No'}
              </span>
              <span className="decode-feature-bit">→ {post.features.hasQuestion.bit}</span>
            </div>
          </div>
          {testingMode && (
            <div className="decode-post-id">
              Post ID: {post.id}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Timeline visualization of contributing posts
 */
function Timeline({ posts }: { posts: ContributingPost[] }) {
  if (posts.length === 0) return null;

  const sortedPosts = [...posts].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

  const firstTime = sortedPosts[0].timestamp.getTime();
  const lastTime = sortedPosts[sortedPosts.length - 1].timestamp.getTime();
  const range = lastTime - firstTime || 1;

  return (
    <div className="decode-timeline">
      <div className="decode-timeline-bar">
        {sortedPosts.map((post, index) => {
          const position = ((post.timestamp.getTime() - firstTime) / range) * 100;
          return (
            <div
              key={post.id}
              className="decode-timeline-dot"
              style={{ left: `${position}%` }}
              title={`${formatDate(post.timestamp)}: ${formatBits(post.extractedBits)}`}
            >
              <span className="decode-timeline-index">{index + 1}</span>
            </div>
          );
        })}
      </div>
      <div className="decode-timeline-labels">
        <span>{formatDate(sortedPosts[0].timestamp)}</span>
        <span>{formatDate(sortedPosts[sortedPosts.length - 1].timestamp)}</span>
      </div>
    </div>
  );
}

/**
 * Decode explainer component.
 * Shows how a message was decoded from signal posts.
 *
 * Production mode: Collapsed by default, shows summary.
 * Testing mode: Expanded by default, shows full technical details.
 */
export function DecodeExplainer({
  message,
  showTimeline = false,
  className = '',
}: DecodeExplainerProps) {
  const testingMode = useTestingMode();
  const [expanded, setExpanded] = useState(testingMode);
  const [timelineVisible, setTimelineVisible] = useState(showTimeline);

  const postCount = message.contributingPosts.length;
  const totalBits = message.bitCount;

  return (
    <div className={`decode-explainer ${testingMode ? 'testing-mode' : ''} ${className}`}>
      {/* Header */}
      <button
        type="button"
        className="decode-explainer-header"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <span className="decode-explainer-title">
          {testingMode ? 'DECODE PROVENANCE' : 'How this was received'}
        </span>
        <span className="decode-explainer-summary">
          {postCount} post{postCount !== 1 ? 's' : ''} • {totalBits} bits
        </span>
        <span className="decode-explainer-toggle">{expanded ? '▼' : '▶'}</span>
      </button>

      {expanded && (
        <div className="decode-explainer-body">
          {/* Status indicators */}
          <div className="decode-status-row">
            <div className={`decode-status ${message.hmacStatus.verified ? 'success' : 'error'}`}>
              <span className="decode-status-icon">
                {message.hmacStatus.verified ? '✓' : '✗'}
              </span>
              <span className="decode-status-label">
                {testingMode ? 'HMAC Verified' : 'Authenticated'}
              </span>
            </div>

            {message.errorCorrection.applied && (
              <div className="decode-status warning">
                <span className="decode-status-icon">⚠</span>
                <span className="decode-status-label">
                  {testingMode
                    ? `RS: ${message.errorCorrection.errorsCorrected}/${message.errorCorrection.maxCorrectable} errors corrected`
                    : `${message.errorCorrection.errorsCorrected} error${message.errorCorrection.errorsCorrected !== 1 ? 's' : ''} corrected`}
                </span>
              </div>
            )}

            {!message.errorCorrection.applied && message.errorCorrection.errorsCorrected === 0 && (
              <div className="decode-status success">
                <span className="decode-status-icon">✓</span>
                <span className="decode-status-label">
                  {testingMode ? 'RS: No errors' : 'Clean reception'}
                </span>
              </div>
            )}
          </div>

          {/* Testing mode: technical details */}
          {testingMode && (
            <div className="decode-technical">
              <div className="decode-technical-row">
                <span className="decode-technical-label">Version:</span>
                <span className="decode-technical-value">{message.version}</span>
              </div>
              <div className="decode-technical-row">
                <span className="decode-technical-label">Encrypted:</span>
                <span className="decode-technical-value">{message.encrypted ? 'Yes' : 'No'}</span>
              </div>
              {message.epochKeyHex && (
                <div className="decode-technical-row">
                  <span className="decode-technical-label">Epoch Key:</span>
                  <span className="decode-technical-value mono">{message.epochKeyHex}...</span>
                </div>
              )}
              {message.rawFrameHex && (
                <div className="decode-technical-row">
                  <span className="decode-technical-label">Frame:</span>
                  <span className="decode-technical-value mono">
                    {truncate(message.rawFrameHex, 32)}...
                  </span>
                </div>
              )}
              {message.hmacStatus.computed && (
                <div className="decode-technical-row">
                  <span className="decode-technical-label">HMAC:</span>
                  <span className="decode-technical-value mono">{message.hmacStatus.computed}</span>
                </div>
              )}
              <div className="decode-spec-ref">See SPEC.md §8 (Message Frame Format)</div>
            </div>
          )}

          {/* Timeline toggle */}
          {postCount > 1 && (
            <button
              type="button"
              className="decode-timeline-toggle"
              onClick={() => setTimelineVisible(!timelineVisible)}
            >
              {timelineVisible ? 'Hide timeline' : 'Show timeline'}
            </button>
          )}

          {/* Timeline visualization */}
          {timelineVisible && postCount > 1 && (
            <Timeline posts={message.contributingPosts} />
          )}

          {/* Contributing posts */}
          <div className="decode-posts">
            <div className="decode-posts-header">
              {testingMode ? 'Signal Posts' : 'Contributing posts'}
            </div>
            {message.contributingPosts.map((post) => (
              <PostRow key={post.id} post={post} testingMode={testingMode} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
