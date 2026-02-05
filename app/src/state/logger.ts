// Module: state/logger
// Development-mode logging for state transitions

import type { DomainState } from './domains';

const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV;

/**
 * Log state transitions in development mode
 * Redacts sensitive fields (key cache) for safe console output
 */
export function logTransition(
  domain: string,
  action: string,
  prevState: DomainState,
  nextState: DomainState
): void {
  if (!isDev) return;

  // Redact sensitive fields
  const redacted = (state: DomainState) => ({
    ...state,
    security: {
      unlocked: state.security.unlocked,
      _keyCache: `[${state.security._keyCache.size} keys]`,
    },
  });

  console.groupCollapsed(`[state] ${domain}.${action}`);
  console.log('prev:', redacted(prevState));
  console.log('next:', redacted(nextState));
  console.groupEnd();
}
