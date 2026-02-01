import React from 'react';
import { FeedColumn } from '../components/FeedColumn';
import { ComposeBox } from '../components/ComposeBox';
import type { FeedCardPost } from '../components/FeedCard';
import './MainView.css';

export interface MainViewProps {
  columns: Array<{
    id: string;
    title: string;
    posts: FeedCardPost[];
    loading?: boolean;
  }>;
  onCompose: (text: string) => void;
  showSignalIndicator?: boolean;
}

export const MainView: React.FC<MainViewProps> = ({
  columns,
  onCompose,
  showSignalIndicator = false
}) => {
  return (
    <div className="main-view">
      <header className="main-view__header">
        <div className="main-view__header-content">
          <div className="main-view__logo">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
          </div>
          <h1 className="main-view__title">FeedDeck</h1>
        </div>

        <div className="main-view__header-actions">
          <button className="main-view__settings-button" aria-label="Settings">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M12 1v6m0 6v6m6-12h-6m-6 0H1m17.5 3.5l-4.24 4.24m-6 0L3.5 9.5m14 14l-4.24-4.24m-6 0L3.5 23.5"></path>
            </svg>
          </button>
        </div>
      </header>

      <div className="main-view__compose-container">
        <ComposeBox onSubmit={onCompose} />
      </div>

      <div className="main-view__columns">
        {columns.map((column) => (
          <FeedColumn
            key={column.id}
            title={column.title}
            posts={column.posts}
            loading={column.loading}
            showSignalIndicator={showSignalIndicator}
          />
        ))}
      </div>
    </div>
  );
};
