import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

/**
 * Testing mode context for self-documenting UI features.
 * When active, bypasses stealth constraints and shows all explanations.
 *
 * Activation precedence (first match wins):
 * 1. URL param: ?testing=1
 * 2. Environment: import.meta.env.VITE_TESTING_MODE === 'true'
 * 3. localStorage: stego_testing_mode === 'true'
 * 4. Default: false (production mode)
 */

const TestingModeContext = createContext<boolean>(false);

/**
 * Hook to access testing mode state.
 * @returns boolean - true if testing mode is active
 */
export function useTestingMode(): boolean {
  return useContext(TestingModeContext);
}

/**
 * Determine if testing mode should be active based on precedence rules.
 */
function getTestingModeState(): boolean {
  // 1. URL param takes highest precedence
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const testingParam = urlParams.get('testing');
    if (testingParam !== null) {
      return testingParam === '1' || testingParam === 'true';
    }
  }

  // 2. Environment variable
  if (import.meta.env.VITE_TESTING_MODE === 'true') {
    return true;
  }

  // 3. localStorage
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('stego_testing_mode');
    if (stored === 'true') {
      return true;
    }
  }

  // 4. Default: production mode
  return false;
}

interface TestingModeProviderProps {
  children: ReactNode;
  /** Override the automatic detection (useful for tests) */
  forceValue?: boolean;
}

/**
 * Provider component for testing mode context.
 * Wrap your app with this to enable testing mode detection.
 */
export function TestingModeProvider({ children, forceValue }: TestingModeProviderProps) {
  const [testingMode, setTestingMode] = useState<boolean>(
    forceValue !== undefined ? forceValue : getTestingModeState
  );

  // Re-evaluate on URL changes (for SPA navigation)
  useEffect(() => {
    if (forceValue !== undefined) return;

    const handlePopState = () => {
      setTestingMode(getTestingModeState());
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [forceValue]);

  // Listen for localStorage changes (cross-tab sync)
  useEffect(() => {
    if (forceValue !== undefined) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'stego_testing_mode') {
        setTestingMode(getTestingModeState());
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [forceValue]);

  return (
    <TestingModeContext.Provider value={testingMode}>
      {children}
    </TestingModeContext.Provider>
  );
}

/**
 * Utility to programmatically enable/disable testing mode via localStorage.
 * Useful for developer tools or settings UI.
 */
export function setTestingModeStorage(enabled: boolean): void {
  if (enabled) {
    localStorage.setItem('stego_testing_mode', 'true');
  } else {
    localStorage.removeItem('stego_testing_mode');
  }
  // Dispatch storage event for same-tab listeners
  window.dispatchEvent(new StorageEvent('storage', { key: 'stego_testing_mode' }));
}
