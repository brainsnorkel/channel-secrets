// Module: schemas
// tosijs-schema definitions for runtime validation

import { s, type Infer } from 'tosijs-schema';

/**
 * Platform source schema
 * Defines a single platform source (Bluesky account or RSS feed)
 */
export const SourceSchema = s.object({
  platform: s.enum(['bluesky', 'rss']),
  // For Bluesky sources
  handle: s.string.optional,
  // For RSS sources
  feedUrl: s.string.optional,
});

export type Source = Infer<typeof SourceSchema>;

/**
 * Channel schema
 * Validates channel configurations including keys, beacons, and sources
 */
export const ChannelSchema = s.object({
  // UUID v4 format
  id: s.uuid,
  name: s.string.min(1).max(100),
  // Base64url-encoded 256-bit key (256 bits = 32 bytes = 43 base64url chars no padding)
  key: s.pattern(/^[A-Za-z0-9_-]{43}$/),
  beaconType: s.enum(['btc', 'nist', 'date']),
  // Selection rate (0.10 to 0.50)
  selectionRate: s.number.min(0.1).max(0.5),
  // Feature set identifier (e.g., "v0" for default)
  featureSet: s.string.default('v0'),
  // Sources I post to (sender role)
  mySources: s.array(SourceSchema).default([]),
  // Sources I monitor (receiver role)
  theirSources: s.array(SourceSchema).default([]),
  // Creation timestamp
  createdAt: s.number,
});

export type Channel = Infer<typeof ChannelSchema>;

/**
 * Message schema
 * Validates decoded messages
 */
export const MessageSchema = s.object({
  id: s.uuid,
  channelId: s.uuid,
  content: s.string.min(1),
  timestamp: s.number,
  direction: s.enum(['sent', 'received']),
  // Optional: transmission metadata
  sourceCount: s.number.optional,
  // Optional: verification status
  verified: s.boolean.default(false).optional,
});

export type Message = Infer<typeof MessageSchema>;

/**
 * Draft post schema
 */
const DraftPostSchema = s.object({
  content: s.string,
  features: s.number, // Encoded feature bits
  createdAt: s.number,
});

/**
 * Transmission state schema
 * Tracks progress of outgoing messages
 */
export const TransmissionStateSchema = s.object({
  messageId: s.uuid,
  channelId: s.uuid,
  // Total bits to transmit
  totalBits: s.number.min(0),
  // Bits successfully transmitted
  transmittedBits: s.number.min(0),
  // Draft posts waiting for matching signal slots
  draftBuffer: s.array(DraftPostSchema).default([]),
  // Which sources have been used for each bit position (bitIndex -> source IDs)
  sourcesUsed: s.record(s.array(s.string)).default({}),
  status: s.enum(['pending', 'in-progress', 'completed', 'failed']).default('pending'),
  startedAt: s.number.optional,
  completedAt: s.number.optional,
});

export type TransmissionState = Infer<typeof TransmissionStateSchema>;

/**
 * UI state schema
 */
export const UIStateSchema = s.object({
  view: s.enum(['feed', 'compose', 'settings', 'channel']).default('feed'),
  loading: s.boolean.default(false),
  error: s.union([s.string, s.null]).default(null),
});

export type UIState = Infer<typeof UIStateSchema>;

/**
 * Complete app state schema
 */
export const AppStateSchema = s.object({
  unlocked: s.boolean.default(false),
  activeChannelId: s.union([s.string, s.null]).default(null),
  channels: s.record(ChannelSchema).default({}),
  messages: s.record(s.array(MessageSchema)).default({}),
  transmissionState: s.record(TransmissionStateSchema).default({}),
  ui: UIStateSchema,
});

export type AppState = Infer<typeof AppStateSchema>;
