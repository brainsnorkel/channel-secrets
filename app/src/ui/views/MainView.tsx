import React, { useState } from 'react';
import { FeedColumn } from '../components/FeedColumn';
import { ComposeBox } from '../components/ComposeBox/ComposeBox';
import { ContactList, type Contact } from '../components/ContactList/ContactList';
import { TransmissionProgress } from '../components/TransmissionProgress/TransmissionProgress';
import { EpochBoundaryWarning } from '../components/EpochBoundaryWarning/EpochBoundaryWarning';
import type { FeedCardPost } from '../components/FeedCard';
import type { Channel } from '../../schemas';
import type { BeaconType } from '../../core/beacon';
import type { TransmissionStatus } from '../../core/sender';
import './MainView.css';

export interface ReceivedMessage {
  id: string;
  text: string;
  receivedAt: Date;
}

export interface MainViewProps {
  // Channel management
  channels: Channel[];
  selectedChannelId: string | null;
  onSelectChannel: (id: string) => void;
  onAddChannel: () => void;
  onDeleteChannel: (id: string) => void;

  // Transmission state
  transmissionStatus: TransmissionStatus | null;
  requiredBits: number[] | null;

  // Actions
  onPublish: (text: string, hasMedia: boolean) => void;
  onQueueMessage?: (message: string) => void;
  onCancelTransmission: () => void;

  // Data
  receivedMessages?: ReceivedMessage[];

  // Optional feed columns (for backward compatibility)
  columns?: Array<{
    id: string;
    title: string;
    posts: FeedCardPost[];
    loading?: boolean;
  }>;
  showSignalIndicator?: boolean;
}

export const MainView: React.FC<MainViewProps> = ({
  channels,
  selectedChannelId,
  onSelectChannel,
  onAddChannel,
  onDeleteChannel,
  transmissionStatus,
  requiredBits,
  onPublish,
  onQueueMessage,
  onCancelTransmission,
  receivedMessages = [],
  columns = [],
  showSignalIndicator = false
}) => {
  const [queueInput, setQueueInput] = useState('');
  const MAX_PAYLOAD_CHARS = 236;

  // Map channels to contacts for ContactList
  const contacts: Contact[] = channels.map(channel => ({
    id: channel.id,
    nickname: channel.name,
    handle: channel.theirSources[0]?.handle || 'unknown',
    status: transmissionStatus?.active && selectedChannelId === channel.id ? 'sending' : 'idle',
    unreadCount: 0,
  }));

  // Get selected channel info for transmission progress
  const selectedChannel = channels.find(c => c.id === selectedChannelId);

  // Check if we're actively transmitting on selected channel
  const isTransmitting = transmissionStatus?.active && selectedChannelId;

  const handleQueueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (queueInput.trim() && onQueueMessage) {
      onQueueMessage(queueInput);
      setQueueInput('');
    }
  };

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
          <h1 className="main-view__title">StegoChannel</h1>
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

      <div className="main-view__body">
        {/* Sidebar with contacts */}
        <aside className="main-view__sidebar">
          <ContactList
            contacts={contacts}
            selectedId={selectedChannelId || undefined}
            onSelect={onSelectChannel}
            onAddContact={onAddChannel}
            onDelete={onDeleteChannel}
          />
        </aside>

        {/* Main content area */}
        <main className="main-view__content">
          {/* Transmission progress (when active) */}
          {isTransmitting && transmissionStatus && selectedChannel && (
            <div className="main-view__transmission">
              <TransmissionProgress
                contactName={selectedChannel.name}
                messagePreview="Transmitting message..."
                bitsTotal={transmissionStatus.progress?.totalBits || 0}
                bitsSent={transmissionStatus.progress?.bitsSent || 0}
                signalPostsUsed={0}
                epochId={transmissionStatus.epochInfo?.epochId || 'unknown'}
                epochExpiresAt={transmissionStatus.epochInfo?.expiresAt || Date.now() + 86400000}
                startedAt={Date.now()}
                beaconType={(transmissionStatus.beaconType || selectedChannel.beaconType || 'date') as BeaconType}
                onCancel={onCancelTransmission}
                isComplete={transmissionStatus.progress?.percentage === 100}
              />
            </div>
          )}

          {/* Compose area */}
          <div className="main-view__compose-container">
            {selectedChannel && transmissionStatus?.epochInfo && (
              <EpochBoundaryWarning
                beaconType={(transmissionStatus.beaconType || selectedChannel.beaconType || 'date') as BeaconType}
                epochExpiresAt={transmissionStatus.epochInfo.expiresAt}
              />
            )}
            <ComposeBox
              channelId={selectedChannelId || undefined}
              requiredBits={requiredBits}
              onPublish={onPublish}
              disabled={!selectedChannelId}
            />

            {/* Queue Message Input */}
            {selectedChannel && !isTransmitting && onQueueMessage && (
              <div className="main-view__queue-section">
                <form className="main-view__queue-form" onSubmit={handleQueueSubmit}>
                  <div className="main-view__queue-header">
                    <label htmlFor="queue-message" className="main-view__queue-label">
                      Queue Secret Message
                    </label>
                    <span className="main-view__queue-counter">
                      {queueInput.length} / {MAX_PAYLOAD_CHARS}
                    </span>
                  </div>
                  <div className="main-view__queue-input-wrapper">
                    <textarea
                      id="queue-message"
                      className="main-view__queue-input"
                      value={queueInput}
                      onChange={(e) => setQueueInput(e.target.value)}
                      maxLength={MAX_PAYLOAD_CHARS}
                      placeholder="Enter a message to hide in your next posts..."
                      rows={2}
                    />
                    <button 
                      type="submit" 
                      className="main-view__queue-button"
                      disabled={!queueInput.trim()}
                    >
                      Queue Message
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Received Messages Section */}
          {selectedChannel && receivedMessages.length > 0 && (
            <div className="main-view__received">
              <h3 className="main-view__received-title">Received Messages</h3>
              <div className="main-view__received-list">
                {receivedMessages.map((msg) => (
                  <div key={msg.id} className="main-view__received-item">
                    <div className="main-view__received-meta">
                      <span className="main-view__received-time">
                        {msg.receivedAt.toLocaleString()}
                      </span>
                    </div>
                    <div className="main-view__received-text">
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Feed columns (if any) */}
          {columns.length > 0 && (
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
          )}

          {/* Empty state when no channel selected */}
          {!selectedChannelId && channels.length > 0 && (
            <div className="main-view__empty">
              <p>Select a channel to start composing</p>
            </div>
          )}

          {/* Empty state when no channels */}
          {channels.length === 0 && (
            <div className="main-view__empty">
              <p>No channels yet. Create one to start communicating securely.</p>
              <button className="main-view__add-channel-button" onClick={onAddChannel}>
                Create Channel
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
