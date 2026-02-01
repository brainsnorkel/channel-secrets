import React from 'react';
import { useTestingMode } from '../context';
import './FeedCard.css';

export interface FeedCardPost {
  id: string;
  text: string;
  author: string;
  timestamp: number;
  hasMedia?: boolean;
  isSignal?: boolean; // Hidden indicator for signal posts
  decodedNote?: string; // Attached note (decoded message in production, explicit in testing)
}

export interface FeedCardProps {
  post: FeedCardPost;
  showSignalIndicator?: boolean; // Default false for plausible deniability
}

export const FeedCard: React.FC<FeedCardProps> = ({
  post,
  showSignalIndicator = false
}) => {
  const testingMode = useTestingMode();

  const formattedTime = new Date(post.timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  // Determine if we should show the signal indicator
  const showIndicator = showSignalIndicator || testingMode;

  // Get the label based on mode
  const getPostLabel = () => {
    if (!showIndicator) return null;

    if (testingMode) {
      // Testing mode: explicit technical labels
      return post.isSignal ? 'SIGNAL POST' : 'COVER POST';
    } else if (showSignalIndicator && post.isSignal) {
      // Production mode with indicator: subtle note label
      return 'synced';
    }
    return null;
  };

  const postLabel = getPostLabel();

  return (
    <article
      className={`feed-card ${post.isSignal && showIndicator ? 'feed-card--signal' : ''} ${testingMode ? 'feed-card--testing' : ''}`}
    >
      {/* Post type label */}
      {postLabel && (
        <div className={`feed-card__label ${testingMode ? 'feed-card__label--testing' : ''} ${post.isSignal ? 'feed-card__label--signal' : 'feed-card__label--cover'}`}>
          {postLabel}
        </div>
      )}

      <header className="feed-card__header">
        <div className="feed-card__avatar">
          {post.author.charAt(0).toUpperCase()}
        </div>
        <div className="feed-card__meta">
          <span className="feed-card__author">{post.author}</span>
          <time className="feed-card__time" dateTime={new Date(post.timestamp).toISOString()}>
            {formattedTime}
          </time>
        </div>
      </header>

      <div className="feed-card__content">
        <p className="feed-card__text">{post.text}</p>
        {post.hasMedia && (
          <div className="feed-card__media-indicator">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3zm11 0H3v6l3-3 2 2 3-3 2 2V3zm0 7.5l-2-2-3 3-2-2-3 3V13h10v-2.5z"/>
              <circle cx="5.5" cy="6.5" r="1.5"/>
            </svg>
          </div>
        )}
      </div>

      {/* Decoded note / message attachment */}
      {post.decodedNote && (
        <div className={`feed-card__note ${testingMode ? 'feed-card__note--testing' : ''}`}>
          <div className="feed-card__note-header">
            {testingMode ? 'DECODED MESSAGE' : 'Note'}
          </div>
          <div className="feed-card__note-content">
            {post.decodedNote}
          </div>
        </div>
      )}
    </article>
  );
};
