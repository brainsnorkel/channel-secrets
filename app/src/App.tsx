import { useState, useEffect, useCallback } from 'react';
import { UnlockScreen } from './ui/components/UnlockScreen';
import { MainView, type ReceivedMessage } from './ui/views/MainView';
import { BlueskyLogin } from './ui/components/BlueskyLogin/BlueskyLogin';
import ChannelWizard from './ui/components/ChannelWizard/ChannelWizard';
import {
  initStorage,
  saveBlueskySession,
  getBlueskySession,
  type StorageInterface,
  type AtpSessionData,
} from './storage';
import { unlock } from './state';
import type { Channel } from './schemas';
import { MessageTransmitter, type TransmissionStatus, getNextRequiredBits } from './core/sender';
import { BlueskyAdapter } from './adapters/atproto';
import './App.css';

// Helper type for beacon types
type BeaconTypeValue = 'date' | 'btc' | 'nist';

// App view states
type AppView = 'unlock' | 'bluesky-login' | 'channel-wizard' | 'main';

function App() {
  // Core state
  const [view, setView] = useState<AppView>('unlock');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Storage and session state
  const [storage, setStorage] = useState<StorageInterface | null>(null);
  const [blueskySession, setBlueskySession] = useState<AtpSessionData | null>(null);
  const [blueskyAdapter, setBlueskyAdapter] = useState<BlueskyAdapter | null>(null);

  // Channel state
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [showChannelWizard, setShowChannelWizard] = useState(false);

  // Transmitter state
  const [transmitter, setTransmitter] = useState<MessageTransmitter | null>(null);
  const [transmissionStatus, setTransmissionStatus] = useState<TransmissionStatus | null>(null);
  const [requiredBits, setRequiredBits] = useState<number[] | null>(null);
  const [receivedMessages] = useState<ReceivedMessage[]>([]); // Placeholder for received messages

  // Get selected channel (used for display purposes)
  const _selectedChannel = channels.find(c => c.id === selectedChannelId) || null;
  void _selectedChannel; // Suppress unused warning - will be used later

  // Load channels from storage
  const loadChannels = useCallback(async (storageInstance: StorageInterface) => {
    try {
      const storedChannels = await storageInstance.listChannels();
      // Map storage Channel to schema Channel format
      const mappedChannels: Channel[] = storedChannels.map(sc => ({
        id: sc.id,
        name: sc.name,
        // Convert Uint8Array key to base64url string
        key: btoa(String.fromCharCode(...Array.from(sc.key)))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, ''),
        beaconType: sc.beaconType,
        selectionRate: 0.25,
        featureSet: 'v0',
        mySources: [],
        theirSources: [],
        createdAt: sc.createdAt instanceof Date ? sc.createdAt.getTime() : Date.now(),
      }));
      setChannels(mappedChannels);
      return mappedChannels;
    } catch (e) {
      console.error('Failed to load channels:', e);
      return [];
    }
  }, []);

  // Update transmission status periodically
  useEffect(() => {
    if (!transmitter || !selectedChannelId) return;

    const updateStatus = async () => {
      try {
        const status = await transmitter.getStatus(selectedChannelId);
        setTransmissionStatus(status);

        if (status.active) {
          const bits = await getNextRequiredBits(transmitter, selectedChannelId);
          setRequiredBits(bits);
        } else {
          setRequiredBits(null);
        }
      } catch (e) {
        console.error('Failed to get transmission status:', e);
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 2000);
    return () => clearInterval(interval);
  }, [transmitter, selectedChannelId]);

  // Handle unlock
  const handleUnlock = async (passphrase: string) => {
    setLoading(true);
    setError(null);

    try {
      // Initialize storage with passphrase
      const storageInstance = await initStorage(passphrase);
      setStorage(storageInstance);

      // Update global state to unlocked
      unlock();

      // Initialize transmitter
      const newTransmitter = new MessageTransmitter(storageInstance);
      setTransmitter(newTransmitter);

      // Check for existing Bluesky session
      const existingSession = await getBlueskySession(storageInstance);
      if (existingSession) {
        setBlueskySession(existingSession);

        // Initialize Bluesky adapter with session
        const adapter = new BlueskyAdapter();
        await adapter.resumeSession(existingSession);
        setBlueskyAdapter(adapter);

        // Load channels and determine next view
        const loadedChannels = await loadChannels(storageInstance);

        // Register channels with transmitter
        for (const channel of loadedChannels) {
          const keyBytes = Uint8Array.from(atob(channel.key.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
          newTransmitter.registerChannel({
            id: channel.id,
            key: keyBytes,
            beaconType: channel.beaconType as BeaconTypeValue,
            selectionRate: channel.selectionRate,
          });
        }

        if (loadedChannels.length > 0) {
          setSelectedChannelId(loadedChannels[0].id);
          setView('main');
        } else {
          setShowChannelWizard(true);
          setView('main');
        }
      } else {
        // No Bluesky session, need to login
        setView('bluesky-login');
      }
    } catch (e) {
      console.error('Unlock failed:', e);
      setError('Invalid passphrase or storage initialization failed');
    } finally {
      setLoading(false);
    }
  };

  // Handle Bluesky login success
  const handleBlueskyLogin = async (session: AtpSessionData) => {
    if (!storage) return;

    try {
      // Save session to encrypted storage
      await saveBlueskySession(storage, session);
      setBlueskySession(session);

      // Initialize Bluesky adapter with session
      const adapter = new BlueskyAdapter();
      await adapter.resumeSession(session);
      setBlueskyAdapter(adapter);

      // Load channels
      const loadedChannels = await loadChannels(storage);

      if (loadedChannels.length > 0) {
        setSelectedChannelId(loadedChannels[0].id);
        setView('main');
      } else {
        // No channels, show wizard
        setShowChannelWizard(true);
        setView('main');
      }
    } catch (e) {
      console.error('Failed to save Bluesky session:', e);
      setError('Failed to save session');
    }
  };

  // Handle channel creation
  const handleChannelComplete = async (channel: Channel) => {
    if (!storage || !transmitter) return;

    try {
      // Convert key from base64url string to Uint8Array for storage
      const keyBytes = Uint8Array.from(
        atob(channel.key.replace(/-/g, '+').replace(/_/g, '/')),
        c => c.charCodeAt(0)
      );

      // Save to storage (storage expects Uint8Array key)
      await storage.saveChannel({
        id: channel.id,
        name: channel.name,
        key: keyBytes,
        beaconType: channel.beaconType as BeaconTypeValue,
        platform: 'bluesky',
        createdAt: new Date(channel.createdAt),
      });

      // Register with transmitter
      transmitter.registerChannel({
        id: channel.id,
        key: keyBytes,
        beaconType: channel.beaconType as BeaconTypeValue,
        selectionRate: channel.selectionRate,
      });

      // Update local state
      setChannels(prev => [...prev, channel]);
      setSelectedChannelId(channel.id);
      setShowChannelWizard(false);
    } catch (e) {
      console.error('Failed to save channel:', e);
    }
  };

  // Handle channel deletion
  const handleDeleteChannel = async (channelId: string) => {
    if (!storage) return;

    try {
      await storage.deleteChannel(channelId);
      setChannels(prev => prev.filter(c => c.id !== channelId));

      if (selectedChannelId === channelId) {
        const remaining = channels.filter(c => c.id !== channelId);
        setSelectedChannelId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (e) {
      console.error('Failed to delete channel:', e);
    }
  };

  // Handle publish
  const handlePublish = async (text: string, hasMedia: boolean) => {
    if (!transmitter || !selectedChannelId || !blueskyAdapter) {
      console.log('Cannot publish - missing transmitter, channel, or adapter');
      return;
    }

    try {
      // 1. Publish the post to Bluesky
      const postUri = await blueskyAdapter.createPost(text);
      console.log('Published post:', postUri);

      // 2. Confirm with transmitter (determines if signal post and advances if bits match)
      const result = await transmitter.confirmPost(selectedChannelId, postUri, text, hasMedia);
      console.log('Confirm result:', result);

      // 3. Update transmission status
      const status = await transmitter.getStatus(selectedChannelId);
      setTransmissionStatus(status);

      if (status.active) {
        // Get next required bits for UI
        const bits = await getNextRequiredBits(transmitter, selectedChannelId);
        setRequiredBits(bits);
      } else {
        setRequiredBits(null);
      }

      // 4. Show feedback to user based on result
      if (result.wasSignal && result.bitsMatched) {
        console.log('✓ Signal post advanced transmission!');
      } else if (result.wasSignal) {
        console.log('Signal post but bits did not match - no advancement');
      } else {
        console.log('Cover post published');
      }
    } catch (e) {
      console.error('Publish failed:', e);
    }
  };

  // Handle message queueing
  const handleQueueMessage = async (channelId: string, message: string) => {
    if (!transmitter) return;

    await transmitter.queueMessage(channelId, message);

    // Update state
    const status = await transmitter.getStatus(channelId);
    setTransmissionStatus(status);

    // Get required bits for first signal post
    const bits = await getNextRequiredBits(transmitter, channelId);
    setRequiredBits(bits);
  };

  // Handle transmission cancel
  const handleCancelTransmission = async () => {
    if (!transmitter || !selectedChannelId) return;

    try {
      await transmitter.cancelTransmission(selectedChannelId);
      setTransmissionStatus(null);
      setRequiredBits(null);
    } catch (e) {
      console.error('Failed to cancel transmission:', e);
    }
  };

  // Render based on current view
  if (view === 'unlock') {
    return <UnlockScreen onUnlock={handleUnlock} error={error || undefined} loading={loading} />;
  }

  if (view === 'bluesky-login') {
    return (
      <BlueskyLogin
        onLoginSuccess={handleBlueskyLogin}
        onCancel={() => setView('unlock')}
      />
    );
  }

  // Main view with optional channel wizard overlay
  return (
    <>
      <MainView
        channels={channels}
        selectedChannelId={selectedChannelId}
        onSelectChannel={setSelectedChannelId}
        onAddChannel={() => setShowChannelWizard(true)}
        onDeleteChannel={handleDeleteChannel}
        transmissionStatus={transmissionStatus}
        requiredBits={requiredBits}
        onPublish={handlePublish}
        onQueueMessage={(msg) => selectedChannelId && handleQueueMessage(selectedChannelId, msg)}
        receivedMessages={receivedMessages}
        onCancelTransmission={handleCancelTransmission}
      />

      {showChannelWizard && blueskySession && (
        <ChannelWizard
          myHandle={blueskySession.handle}
          onComplete={handleChannelComplete}
          onCancel={() => {
            setShowChannelWizard(false);
            // If no channels exist, go back to a state where user can try again
            if (channels.length === 0) {
              // Stay on main view but wizard can be reopened
            }
          }}
        />
      )}
    </>
  );
}

export default App;
