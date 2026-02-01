// Module: ui/components/DecodeExplainer/types
// Types for decode explainer component

/**
 * A signal post that contributed bits to a decoded message
 */
export interface ContributingPost {
  /** Post identifier */
  id: string;
  /** Post timestamp */
  timestamp: Date;
  /** Preview of post content (truncated) */
  contentPreview: string;
  /** Bits extracted from this post */
  extractedBits: number[];
  /** Source platform */
  source: 'bluesky' | 'rss';
  /** Source identifier (handle or feed URL) */
  sourceId: string;
  /** Feature breakdown */
  features: {
    length: { value: number; threshold: number; bit: number };
    hasMedia: { value: boolean; bit: number };
    hasQuestion: { value: boolean; bit: number };
  };
}

/**
 * Error correction status for a decoded message
 */
export interface ErrorCorrectionStatus {
  /** Whether error correction was applied */
  applied: boolean;
  /** Number of errors corrected */
  errorsCorrected: number;
  /** Maximum correctable errors (Reed-Solomon capacity) */
  maxCorrectable: number;
  /** Symbol positions that were corrected */
  correctedPositions: number[];
}

/**
 * HMAC verification status
 */
export interface HmacStatus {
  /** Whether HMAC was verified successfully */
  verified: boolean;
  /** Expected HMAC value (hex, truncated for display) */
  expected?: string;
  /** Computed HMAC value (hex, truncated for display) */
  computed?: string;
}

/**
 * Extended message with decode provenance information
 */
export interface MessageWithProvenance {
  /** Base message ID */
  id: string;
  /** Channel ID */
  channelId: string;
  /** Decoded content */
  content: Uint8Array;
  /** Decode timestamp */
  timestamp: Date;
  /** Total bits used */
  bitCount: number;
  /** Whether message was authenticated */
  authenticated: boolean;
  /** Protocol version */
  version: number;
  /** Whether message was encrypted */
  encrypted: boolean;

  // Provenance information
  /** Signal posts that contributed to this message */
  contributingPosts: ContributingPost[];
  /** Error correction status */
  errorCorrection: ErrorCorrectionStatus;
  /** HMAC verification status */
  hmacStatus: HmacStatus;
  /** Raw frame bytes (hex string) - only shown in testing mode */
  rawFrameHex?: string;
  /** Epoch key used (hex string, truncated) - only shown in testing mode */
  epochKeyHex?: string;
}
