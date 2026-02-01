import React, { useState, useCallback } from 'react';
import './UnlockScreen.css';

export interface UnlockScreenProps {
  onUnlock: (passphrase: string) => void | Promise<void>;
  error?: string;
  loading?: boolean;
}

export const UnlockScreen: React.FC<UnlockScreenProps> = ({
  onUnlock,
  error,
  loading = false
}) => {
  const [passphrase, setPassphrase] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (passphrase.trim().length > 0 && !loading) {
      await onUnlock(passphrase);
    }
  }, [passphrase, loading, onUnlock]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleSubmit(e as any);
    }
  }, [handleSubmit, loading]);

  return (
    <div className="unlock-screen">
      <div className="unlock-screen__container">
        <div className="unlock-screen__logo">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>

        <h1 className="unlock-screen__title">FeedDeck</h1>
        <p className="unlock-screen__subtitle">Sign in to continue</p>

        <form className="unlock-screen__form" onSubmit={handleSubmit}>
          <div className="unlock-screen__input-group">
            <label htmlFor="passphrase" className="unlock-screen__label">
              Passphrase
            </label>
            <div className="unlock-screen__input-wrapper">
              <input
                id="passphrase"
                type={showPassphrase ? 'text' : 'password'}
                className="unlock-screen__input"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter your passphrase"
                autoFocus
                autoComplete="current-password"
                disabled={loading}
              />
              <button
                type="button"
                className="unlock-screen__toggle-visibility"
                onClick={() => setShowPassphrase(!showPassphrase)}
                aria-label={showPassphrase ? 'Hide passphrase' : 'Show passphrase'}
                disabled={loading}
              >
                {showPassphrase ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="unlock-screen__error">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zM7 4h2v5H7V4zm0 6h2v2H7v-2z"/>
              </svg>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="unlock-screen__submit"
            disabled={passphrase.trim().length === 0 || loading}
          >
            {loading ? (
              <>
                <div className="unlock-screen__spinner"></div>
                <span>Unlocking...</span>
              </>
            ) : (
              'Unlock'
            )}
          </button>
        </form>

        <p className="unlock-screen__footer">
          Secure access to your personalized feed
        </p>
      </div>
    </div>
  );
};
