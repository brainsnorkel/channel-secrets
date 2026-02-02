import React, { useState, useCallback } from 'react';
import type { AtpSessionData } from '@atproto/api';
import { BlueskyAdapter } from '../../../adapters/atproto';
import './BlueskyLogin.css';

export interface BlueskyLoginProps {
  onLoginSuccess: (session: AtpSessionData) => void;
  onCancel?: () => void;
  initialHandle?: string;
}

export const BlueskyLogin: React.FC<BlueskyLoginProps> = ({
  onLoginSuccess,
  onCancel,
  initialHandle = ''
}) => {
  const [handle, setHandle] = useState(initialHandle);
  const [appPassword, setAppPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (handle.trim().length === 0 || appPassword.trim().length === 0) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const adapter = new BlueskyAdapter();
      await adapter.login(handle.trim(), appPassword);

      const session = adapter.getSession();
      if (!session) {
        throw new Error('Login succeeded but no session was created');
      }

      onLoginSuccess(session);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred during login');
      }
    } finally {
      setIsLoading(false);
    }
  }, [handle, appPassword, onLoginSuccess]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSubmit(e as any);
    }
  }, [handleSubmit, isLoading]);

  return (
    <div className="bluesky-login">
      <div className="bluesky-login__container">
        <div className="bluesky-login__logo">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <path
              d="M32 12c-5.5 8-11 14-16 16 5 2 10.5 8 16 16 5.5-8 11-14 16-16-5-2-10.5-8-16-16z"
              fill="currentColor"
              opacity="0.8"
            />
            <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        </div>

        <h1 className="bluesky-login__title">Connect to Bluesky</h1>
        <p className="bluesky-login__subtitle">Sign in with your app password</p>

        <div className="bluesky-login__warning">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zM7 4h2v5H7V4zm0 6h2v2H7v-2z"/>
          </svg>
          <span>Never use your main Bluesky password. Always use an app password.</span>
        </div>

        <form className="bluesky-login__form" onSubmit={handleSubmit}>
          <div className="bluesky-login__input-group">
            <label htmlFor="handle" className="bluesky-login__label">
              Handle or Email
            </label>
            <input
              id="handle"
              type="text"
              className="bluesky-login__input"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="alice.bsky.social"
              autoFocus
              autoComplete="username"
              disabled={isLoading}
            />
          </div>

          <div className="bluesky-login__input-group">
            <label htmlFor="appPassword" className="bluesky-login__label">
              App Password
            </label>
            <div className="bluesky-login__input-wrapper">
              <input
                id="appPassword"
                type={showPassword ? 'text' : 'password'}
                className="bluesky-login__input"
                value={appPassword}
                onChange={(e) => setAppPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="xxxx-xxxx-xxxx-xxxx"
                autoComplete="current-password"
                disabled={isLoading}
              />
              <button
                type="button"
                className="bluesky-login__toggle-visibility"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                disabled={isLoading}
              >
                {showPassword ? (
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
            <a
              href="https://bsky.app/settings/app-passwords"
              target="_blank"
              rel="noopener noreferrer"
              className="bluesky-login__app-password-link"
            >
              Generate app password
            </a>
          </div>

          {error && (
            <div className="bluesky-login__error">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zM7 4h2v5H7V4zm0 6h2v2H7v-2z"/>
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="bluesky-login__button-group">
            <button
              type="submit"
              className="bluesky-login__submit"
              disabled={handle.trim().length === 0 || appPassword.trim().length === 0 || isLoading}
            >
              {isLoading ? (
                <>
                  <div className="bluesky-login__spinner"></div>
                  <span>Connecting...</span>
                </>
              ) : (
                'Sign In'
              )}
            </button>
            {onCancel && (
              <button
                type="button"
                className="bluesky-login__cancel"
                onClick={onCancel}
                disabled={isLoading}
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        <p className="bluesky-login__footer">
          App passwords are safer than your main password and can be revoked anytime
        </p>
      </div>
    </div>
  );
};

export default BlueskyLogin;
