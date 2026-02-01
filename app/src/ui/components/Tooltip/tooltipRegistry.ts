/**
 * Tooltip content registry for self-documenting UI.
 * Centralized definitions for all tooltip content, structured for i18n.
 *
 * SPEC references follow SPEC.md section numbers.
 */

export type TooltipId =
  | 'signal-post'
  | 'cover-post'
  | 'feature-bits'
  | 'feature-length'
  | 'feature-media'
  | 'feature-firstchar'
  | 'epoch'
  | 'beacon'
  | 'beacon-btc'
  | 'beacon-nist'
  | 'beacon-date'
  | 'threshold'
  | 'hmac'
  | 'reed-solomon'
  | 'channel-key'
  | 'transmission-progress';

export interface TooltipContent {
  /** Short description shown initially */
  short: string;
  /** Extended description shown on "Learn more" */
  long: string;
  /** Optional SPEC.md section reference */
  specRef?: string;
}

/**
 * Registry of all tooltip content.
 * Keys match TooltipId type.
 */
export const TOOLTIP_CONTENT: Record<TooltipId, TooltipContent> = {
  'signal-post': {
    short: 'This post carries message data',
    long: 'Selected as a signal post because hash(post_id + epoch_key) < threshold. Approximately 25% of posts are selected as signal posts. The post\'s features (length, media, punctuation) encode 3 bits of your message.',
    specRef: '§7.1',
  },

  'cover-post': {
    short: 'This post provides cover traffic',
    long: 'Not selected as a signal post (hash above threshold). Cover posts maintain normal posting patterns and provide plausible deniability. You can publish these freely without affecting message transmission.',
    specRef: '§7.1',
  },

  'feature-bits': {
    short: '3 bits encoded by post characteristics',
    long: 'Each signal post encodes 3 bits based on its features: length (≥100 chars = 1), media attachment (has image = 1), and first character type (letter = 1). Combined as a 3-bit value (0b000 to 0b111).',
    specRef: '§8.2',
  },

  'feature-length': {
    short: 'Post length determines bit 0',
    long: 'Posts with 100 or more characters encode bit value 1. Shorter posts encode 0. Character count includes all text content excluding any URLs or mentions.',
    specRef: '§8.2.1',
  },

  'feature-media': {
    short: 'Media attachment determines bit 1',
    long: 'Posts with at least one image, video, or other media attachment encode bit value 1. Text-only posts encode 0.',
    specRef: '§8.2.2',
  },

  'feature-firstchar': {
    short: 'First character type determines bit 2',
    long: 'Posts starting with a letter (A-Z, a-z) encode bit value 1. Posts starting with numbers, punctuation, or emoji encode 0.',
    specRef: '§8.2.3',
  },

  'epoch': {
    short: 'Time period for key derivation',
    long: 'An epoch is a time period during which the same epoch key is used for post selection. Both sender and receiver must be in the same epoch to communicate. Epoch boundaries depend on the beacon type.',
    specRef: '§5.2',
  },

  'beacon': {
    short: 'Public randomness source for epochs',
    long: 'A beacon provides public, unpredictable values that define epoch boundaries. Both parties use the same beacon to stay synchronized without coordination.',
    specRef: '§5.1',
  },

  'beacon-btc': {
    short: 'Bitcoin block hash beacon',
    long: 'Uses the latest Bitcoin block hash as the epoch value. New epoch approximately every 10 minutes. Provides strong unpredictability but requires blockchain API access.',
    specRef: '§5.1.1',
  },

  'beacon-nist': {
    short: 'NIST randomness beacon',
    long: 'Uses the NIST Randomness Beacon service. New value every 60 seconds. Highly reliable and verifiable but requires internet access to beacon.nist.gov.',
    specRef: '§5.1.2',
  },

  'beacon-date': {
    short: 'Date-based beacon (UTC)',
    long: 'Uses the current UTC date (YYYY-MM-DD) as the epoch value. Simplest beacon type with daily epochs. Both parties must have accurate system clocks.',
    specRef: '§5.1.3',
  },

  threshold: {
    short: 'Selection probability (~25%)',
    long: 'The threshold determines what fraction of posts become signal posts. Default is 0x40000000, meaning approximately 25% of posts will be selected. Lower threshold = fewer signal posts = slower but stealthier transmission.',
    specRef: '§7.2',
  },

  hmac: {
    short: 'Message authentication code',
    long: 'HMAC-SHA256 truncated to 64 bits. Verifies that the message was sent by someone with the channel key and hasn\'t been tampered with. Failed HMAC means corrupted or forged message.',
    specRef: '§8.5',
  },

  'reed-solomon': {
    short: 'Error correction coding',
    long: 'Reed-Solomon coding adds redundancy to detect and correct errors. Can recover from up to 4 corrupted symbols (bytes) in the message. Protects against missed or misread signal posts.',
    specRef: '§8.4',
  },

  'channel-key': {
    short: 'Shared secret for this channel',
    long: 'A 256-bit secret key shared between sender and receiver. Used to derive epoch keys for post selection and for message encryption. Must be exchanged securely out-of-band.',
    specRef: '§4.1',
  },

  'transmission-progress': {
    short: 'Message sending progress',
    long: 'Shows how many bits of your message have been transmitted via signal posts. At approximately 8 bits per day (with ~25% selection rate and 3 bits per signal post), a typical short message takes 2-7 days.',
    specRef: '§9.1',
  },
};

/**
 * Get tooltip content by ID.
 * Returns undefined if ID not found (graceful fallback).
 */
export function getTooltipContent(id: TooltipId): TooltipContent | undefined {
  return TOOLTIP_CONTENT[id];
}

/**
 * Check if a tooltip ID exists in the registry.
 */
export function hasTooltip(id: string): id is TooltipId {
  return id in TOOLTIP_CONTENT;
}
