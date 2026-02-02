// Module: core/drafts
// Draft buffer system for rejected posts

import type { StorageInterface } from '../storage';

/**
 * Saved draft post with extracted features
 */
export interface SavedDraft {
  id: string;
  channelId: string;
  text: string;
  hasMedia: boolean;
  extractedBits: number[];
  savedAt: number; // Unix timestamp
}

/**
 * Draft buffer configuration
 */
export interface DraftBufferConfig {
  maxDraftsPerChannel: number;
  maxAgeDays: number;
}

/**
 * Draft buffer for managing rejected posts
 *
 * When a user composes a post but its bits don't match the required bits,
 * they can save it to the draft buffer for later use when those bits are needed.
 */
export class DraftBuffer {
  private storage: StorageInterface;
  private config: DraftBufferConfig;

  constructor(
    storage: StorageInterface,
    config: Partial<DraftBufferConfig> = {}
  ) {
    this.storage = storage;
    this.config = {
      maxDraftsPerChannel: config.maxDraftsPerChannel ?? 20,
      maxAgeDays: config.maxAgeDays ?? 30,
    };
  }

  /**
   * Save a draft to the buffer
   *
   * @param channelId - Channel ID
   * @param draft - Draft to save (without id and savedAt, which are auto-generated)
   * @returns The saved draft with generated id and savedAt
   */
  async save(
    channelId: string,
    draft: Omit<SavedDraft, 'id' | 'savedAt'>
  ): Promise<SavedDraft> {
    // Validate text length
    if (draft.text.length > 500) {
      throw new Error('Draft text exceeds maximum length of 500 characters');
    }

    // Load existing drafts
    const drafts = await this.list(channelId);

    // Generate new draft with id and timestamp
    const newDraft: SavedDraft = {
      ...draft,
      id: this.generateId(),
      savedAt: Date.now(),
    };

    // Add to list
    drafts.push(newDraft);

    // Enforce maximum drafts per channel (keep most recent)
    if (drafts.length > this.config.maxDraftsPerChannel) {
      drafts.sort((a, b) => b.savedAt - a.savedAt);
      drafts.splice(this.config.maxDraftsPerChannel);
    }

    // Save back to storage
    await this.saveDrafts(channelId, drafts);

    return newDraft;
  }

  /**
   * Get all drafts for a channel
   *
   * @param channelId - Channel ID
   * @returns Array of drafts, sorted by most recent first
   */
  async list(channelId: string): Promise<SavedDraft[]> {
    const key = this.getStorageKey(channelId);
    const drafts = await this.storage.getState<SavedDraft[]>(key);

    if (!drafts) {
      return [];
    }

    // Sort by most recent first
    return drafts.sort((a, b) => b.savedAt - a.savedAt);
  }

  /**
   * Delete a specific draft
   *
   * @param channelId - Channel ID
   * @param draftId - Draft ID to delete
   * @returns true if draft was found and deleted, false otherwise
   */
  async delete(channelId: string, draftId: string): Promise<boolean> {
    const drafts = await this.list(channelId);
    const initialLength = drafts.length;

    const filtered = drafts.filter(d => d.id !== draftId);

    if (filtered.length === initialLength) {
      return false; // Draft not found
    }

    await this.saveDrafts(channelId, filtered);
    return true;
  }

  /**
   * Find drafts that match specific target bits
   *
   * @param channelId - Channel ID
   * @param targetBits - Target bit pattern to match
   * @returns Array of matching drafts, sorted by most recent first
   */
  async findMatching(channelId: string, targetBits: number[]): Promise<SavedDraft[]> {
    const drafts = await this.list(channelId);

    return drafts.filter(draft =>
      arraysEqual(draft.extractedBits, targetBits)
    );
  }

  /**
   * Clear all drafts for a channel
   *
   * @param channelId - Channel ID
   */
  async clear(channelId: string): Promise<void> {
    const key = this.getStorageKey(channelId);
    await this.storage.deleteState(key);
  }

  /**
   * Remove drafts older than specified days
   *
   * Note: This method requires knowing which channels to clean.
   * Use cleanupChannel() for individual channel cleanup.
   *
   * @param _maxAgeDays - Maximum age in days (unused - use cleanupChannel instead)
   * @returns Number of drafts cleaned up (always 0 - use cleanupChannel instead)
   */
  async cleanup(_maxAgeDays?: number): Promise<number> {
    // Note: This is a placeholder for interface compatibility
    // The actual cleanup logic is in cleanupChannel()
    // To clean all channels, call cleanupChannel() for each channel ID
    return 0;
  }

  /**
   * Clean up old drafts for a specific channel
   *
   * @param channelId - Channel ID
   * @param maxAgeDays - Maximum age in days (defaults to config value)
   * @returns Number of drafts removed
   */
  async cleanupChannel(channelId: string, maxAgeDays?: number): Promise<number> {
    const maxAge = maxAgeDays ?? this.config.maxAgeDays;
    const cutoffTime = Date.now() - (maxAge * 24 * 60 * 60 * 1000);

    const drafts = await this.list(channelId);
    const filtered = drafts.filter(d => d.savedAt >= cutoffTime);

    const removed = drafts.length - filtered.length;

    if (removed > 0) {
      await this.saveDrafts(channelId, filtered);
    }

    return removed;
  }

  /**
   * Get storage key for channel drafts
   */
  private getStorageKey(channelId: string): string {
    return `drafts:${channelId}`;
  }

  /**
   * Save drafts array to storage
   */
  private async saveDrafts(channelId: string, drafts: SavedDraft[]): Promise<void> {
    const key = this.getStorageKey(channelId);

    if (drafts.length === 0) {
      await this.storage.deleteState(key);
    } else {
      await this.storage.saveState(key, drafts);
    }
  }

  /**
   * Generate a unique draft ID
   */
  private generateId(): string {
    return `draft_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}

/**
 * Helper function to check if two arrays are equal
 *
 * @param a - First array
 * @param b - Second array
 * @returns true if arrays have the same elements in the same order
 */
export function arraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) {
    return false;
  }

  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }

  return true;
}
