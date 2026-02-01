import { useState } from 'react';
import { UnlockScreen } from './ui/components/UnlockScreen';
import { MainView } from './ui/views/MainView';
import { initStorage } from './storage';
import { unlock } from './state';
import './App.css';

function App() {
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUnlock = async (passphrase: string) => {
    setLoading(true);
    setError(null);

    try {
      // Initialize storage with passphrase
      await initStorage(passphrase);

      // Update state to unlocked
      unlock();
      setUnlocked(true);
    } catch (e) {
      console.error('Unlock failed:', e);
      setError('Invalid passphrase or storage initialization failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCompose = (text: string) => {
    console.log('Compose:', text);
    // TODO: Wire up compose functionality
  };

  if (!unlocked) {
    return <UnlockScreen onUnlock={handleUnlock} error={error || undefined} loading={loading} />;
  }

  return (
    <MainView
      columns={[
        {
          id: 'main',
          title: 'Main Feed',
          posts: [],
          loading: false,
        },
      ]}
      onCompose={handleCompose}
      showSignalIndicator={false}
    />
  );
}

export default App;
