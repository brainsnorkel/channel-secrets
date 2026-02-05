// Module: state/updates
// Immutable update helpers for domain state

import type { DomainState } from './domains';

/**
 * Update a specific domain slice immutably
 * In development mode, freezes the result to catch mutations
 *
 * @param state - Current domain state
 * @param domain - Domain key to update
 * @param updater - Function that receives current domain state and returns new state
 * @returns New domain state with updated slice
 */
export function updateDomain<K extends keyof DomainState>(
  state: DomainState,
  domain: K,
  updater: (current: DomainState[K]) => DomainState[K]
): DomainState {
  const frozen = import.meta.env?.DEV ?? false;
  const newDomain = updater(state[domain]);
  const result = {
    ...state,
    [domain]: newDomain,
  };
  return frozen ? (Object.freeze(result) as DomainState) : result;
}
