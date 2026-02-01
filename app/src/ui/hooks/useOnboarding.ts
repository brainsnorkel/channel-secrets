// Module: ui/hooks/useOnboarding
// Onboarding state management with IndexedDB persistence

import { useState, useEffect, useCallback } from 'react';
import { openDB } from 'idb';
import { useTestingMode } from '../context';

// Database uses stealth naming per stealth-ux spec
const DB_NAME = 'feed_cache';
const DB_VERSION = 1;
const META_KEY = 'onboarding_complete';

/**
 * Check if onboarding has been completed.
 * Uses the same database as main storage but only accesses the meta store.
 */
async function getOnboardingComplete(): Promise<boolean> {
  try {
    const db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Ensure meta store exists
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta');
        }
      },
    });

    const value = await db.get('meta', META_KEY);
    db.close();
    return value === true;
  } catch (error) {
    console.warn('Failed to read onboarding state:', error);
    return false;
  }
}

/**
 * Persist onboarding completion state.
 */
async function setOnboardingComplete(complete: boolean): Promise<void> {
  try {
    const db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta');
        }
      },
    });

    await db.put('meta', complete, META_KEY);
    db.close();
  } catch (error) {
    console.warn('Failed to save onboarding state:', error);
  }
}

/**
 * Check if there are any channels configured.
 * Returns false if no channels exist (indicating first-time use).
 */
async function hasChannels(): Promise<boolean> {
  try {
    const db = await openDB(DB_NAME, DB_VERSION);

    if (!db.objectStoreNames.contains('channels')) {
      db.close();
      return false;
    }

    const count = await db.count('channels');
    db.close();
    return count > 0;
  } catch (error) {
    console.warn('Failed to check channels:', error);
    return false;
  }
}

export interface UseOnboardingResult {
  /** Whether onboarding modal should be shown */
  showOnboarding: boolean;
  /** Whether we're still loading the initial state */
  loading: boolean;
  /** Mark onboarding as complete */
  completeOnboarding: () => Promise<void>;
  /** Reset onboarding (for debugging/testing) */
  resetOnboarding: () => Promise<void>;
}

/**
 * Hook for managing onboarding state.
 *
 * Trigger conditions for showing onboarding:
 * - Testing mode is inactive
 * - Onboarding has not been completed
 * - No channels exist (first-time user)
 *
 * In testing mode, onboarding is always hidden.
 */
export function useOnboarding(): UseOnboardingResult {
  const testingMode = useTestingMode();
  const [loading, setLoading] = useState(true);
  const [onboardingComplete, setOnboardingCompleteState] = useState(false);
  const [channelsExist, setChannelsExist] = useState(false);

  // Load initial state
  useEffect(() => {
    let mounted = true;

    async function loadState() {
      const [complete, hasExistingChannels] = await Promise.all([
        getOnboardingComplete(),
        hasChannels(),
      ]);

      if (mounted) {
        setOnboardingCompleteState(complete);
        setChannelsExist(hasExistingChannels);
        setLoading(false);
      }
    }

    loadState();

    return () => {
      mounted = false;
    };
  }, []);

  // Complete onboarding
  const completeOnboarding = useCallback(async () => {
    await setOnboardingComplete(true);
    setOnboardingCompleteState(true);
  }, []);

  // Reset onboarding (for debugging)
  const resetOnboarding = useCallback(async () => {
    await setOnboardingComplete(false);
    setOnboardingCompleteState(false);
  }, []);

  // Determine if onboarding should show
  // Per spec: Show when testing mode inactive AND not completed AND no channels
  const showOnboarding = !loading && !testingMode && !onboardingComplete && !channelsExist;

  return {
    showOnboarding,
    loading,
    completeOnboarding,
    resetOnboarding,
  };
}
