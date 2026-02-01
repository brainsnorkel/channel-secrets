import React from 'react';
import './FeedCard.css';

export interface FeedCardPost {
  id: string;
  text: string;
  author: string;
  timestamp: number;
  hasMedia?: boolean;
  isSignal?: boolean; // Hidden indicator for signal posts
}

export interface FeedCardProps {
  post: FeedCardPost;
  showSignalIndicator?: boolean; // Default false for plausible deniability
}

export const FeedCard: React.FC<FeedCardProps> = ({
  post,
  showSignalIndicator = false
}) => {
  const formattedTime = new Date(post.timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <article className={`feed-card ${post.isSignal && showSignalIndicator ? 'feed-card--signal' : ''}`}>
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
    </article>
  );
};
