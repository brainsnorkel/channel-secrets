import React from 'react';
import { FeedCard } from './FeedCard';
import type { FeedCardPost } from './FeedCard';
import './FeedColumn.css';

export interface FeedColumnProps {
  title: string;
  posts: FeedCardPost[];
  loading?: boolean;
  showSignalIndicator?: boolean;
}

export const FeedColumn: React.FC<FeedColumnProps> = ({
  title,
  posts,
  loading = false,
  showSignalIndicator = false
}) => {
  return (
    <div className="feed-column">
      <header className="feed-column__header">
        <h2 className="feed-column__title">{title}</h2>
        {loading && (
          <div className="feed-column__loading-indicator">
            <div className="spinner"></div>
          </div>
        )}
      </header>

      <div className="feed-column__content">
        {loading && posts.length === 0 ? (
          <div className="feed-column__loading-state">
            <div className="spinner spinner--large"></div>
            <p>Loading posts...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="feed-column__empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="9" x2="15" y2="9"></line>
              <line x1="9" y1="15" x2="15" y2="15"></line>
            </svg>
            <p>No posts yet</p>
          </div>
        ) : (
          <div className="feed-column__posts">
            {posts.map(post => (
              <FeedCard
                key={post.id}
                post={post}
                showSignalIndicator={showSignalIndicator}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
