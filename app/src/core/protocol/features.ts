// Module: core/protocol/features
// Feature extraction for StegoChannel protocol (SPEC.md Section 7)

// Type definitions for Intl.Segmenter (ES2023)
declare namespace Intl {
  interface SegmenterOptions {
    granularity?: 'grapheme' | 'word' | 'sentence';
    localeMatcher?: 'lookup' | 'best fit';
  }

  interface Segments {
    [Symbol.iterator](): IterableIterator<{
      segment: string;
      index: number;
      input: string;
      isWordLike?: boolean;
    }>;
  }

  class Segmenter {
    constructor(locales?: string | string[], options?: SegmenterOptions);
    segment(input: string): Segments;
  }
}

/**
 * Extended pronoun list (case-insensitive) from SPEC.md Section 7.5
 */
const PRONOUNS = new Set([
  'i', 'me', 'my', 'mine', 'myself',
  'we', 'us', 'our', 'ours', 'ourselves',
  'you', 'your', 'yours', 'yourself', 'yourselves',
  'he', 'him', 'his', 'himself',
  'she', 'her', 'hers', 'herself',
  'it', 'its', 'itself',
  'they', 'them', 'their', 'theirs', 'themselves',
  'who', 'whom', 'whose', 'what', 'which'
]);

/**
 * Extended article/determiner list (case-insensitive) from SPEC.md Section 7.5
 */
const ARTICLES = new Set([
  'a', 'an', 'the', 'this', 'that', 'these', 'those',
  'some', 'any', 'no', 'every', 'each', 'either', 'neither',
  'another', 'such'
]);

/**
 * Common verb list (case-insensitive, first 50 most common) from SPEC.md Section 7.5
 */
const VERBS = new Set([
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'am',
  'have', 'has', 'had', 'having',
  'do', 'does', 'did', 'doing',
  'will', 'would', 'shall', 'should', 'can', 'could', 'may', 'might', 'must',
  'go', 'goes', 'went', 'going', 'gone',
  'get', 'gets', 'got', 'getting',
  'make', 'makes', 'made', 'making',
  'see', 'sees', 'saw', 'seeing', 'seen',
  'know', 'knows', 'knew', 'knowing', 'known',
  'think', 'thinks', 'thought', 'thinking'
]);

/**
 * Normalize text according to SPEC.md Section 7.4:
 * 1. Apply NFC normalization
 * 2. Collapse consecutive whitespace to single space
 * 3. Trim leading/trailing whitespace
 */
export function normalizeText(text: string): string {
  // Apply NFC normalization
  let normalized = text.normalize('NFC');

  // Collapse consecutive whitespace to single space
  normalized = normalized.replace(/\s+/g, ' ');

  // Trim leading/trailing whitespace
  normalized = normalized.trim();

  return normalized;
}

/**
 * Count Unicode grapheme clusters using Intl.Segmenter (SPEC.md Section 7.4)
 */
export function countGraphemes(text: string): number {
  const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
  const segments = segmenter.segment(text);
  return Array.from(segments).length;
}

/**
 * Extract length bit based on character count threshold (SPEC.md Section 7.1)
 * Returns 1 if char_count >= threshold, else 0
 */
export function extractLengthBit(text: string, threshold: number): 0 | 1 {
  const normalized = normalizeText(text);
  const charCount = countGraphemes(normalized);
  return charCount >= threshold ? 1 : 0;
}

/**
 * Extract media bit (SPEC.md Section 7.2)
 * Returns 1 if post has media, else 0
 */
export function extractMediaBit(hasMedia: boolean): 0 | 1 {
  return hasMedia ? 1 : 0;
}

/**
 * Extract question mark bit (SPEC.md Section 7.3)
 * Returns 1 if text contains '?', else 0
 */
export function extractQuestionBit(text: string): 0 | 1 {
  return text.includes('?') ? 1 : 0;
}

/**
 * Extract first word category bits (SPEC.md Section 7.3, 7.5)
 * Returns 2 bits:
 * - 0b00 = Pronoun
 * - 0b01 = Article/determiner
 * - 0b10 = Common verb
 * - 0b11 = Other
 */
export function extractFirstWordBits(text: string): 0 | 1 | 2 | 3 {
  const normalized = normalizeText(text);

  // Use Unicode word segmentation to find first word
  const segmenter = new Intl.Segmenter('en', { granularity: 'word' });
  const segments = Array.from(segmenter.segment(normalized));

  // Find first word token (isWordLike = true)
  const firstWordSegment = segments.find(s => s.isWordLike);

  if (!firstWordSegment) {
    // No word found (e.g., emoji-only post)
    return 0b11; // Other
  }

  const firstWord = firstWordSegment.segment.toLowerCase();

  // Categorize according to word lists
  if (PRONOUNS.has(firstWord)) {
    return 0b00;
  }
  if (ARTICLES.has(firstWord)) {
    return 0b01;
  }
  if (VERBS.has(firstWord)) {
    return 0b10;
  }

  // Default: Other
  return 0b11;
}

/**
 * Feature set type
 */
export type FeatureId = 'len' | 'media' | 'qmark' | 'fword' | 'wcount';

/**
 * Extract features for a given feature set (SPEC.md Section 7.1)
 *
 * @param text - Post text content
 * @param hasMedia - Whether post has media (images, links, embeds)
 * @param featureSet - Array of feature IDs to extract
 * @param lengthThreshold - Threshold for length feature (default: 50)
 * @returns Object with bits array and total bit count
 */
export function extractFeatures(
  text: string,
  hasMedia: boolean,
  featureSet: FeatureId[],
  lengthThreshold: number = 50
): { bits: number[]; bitCount: number } {
  const bits: number[] = [];

  for (const feature of featureSet) {
    switch (feature) {
      case 'len':
        bits.push(extractLengthBit(text, lengthThreshold));
        break;

      case 'media':
        bits.push(extractMediaBit(hasMedia));
        break;

      case 'qmark':
        bits.push(extractQuestionBit(text));
        break;

      case 'fword': {
        const fwordBits = extractFirstWordBits(text);
        // Extract 2 bits from the value
        bits.push((fwordBits >> 1) & 1); // High bit
        bits.push(fwordBits & 1);         // Low bit
        break;
      }

      case 'wcount':
        // TODO: Implement word count quartile feature when needed
        throw new Error('wcount feature not yet implemented');

      default:
        throw new Error(`Unknown feature: ${feature}`);
    }
  }

  return {
    bits,
    bitCount: bits.length
  };
}
