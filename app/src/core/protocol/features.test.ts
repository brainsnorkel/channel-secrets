// Module: core/protocol/features.test
// Test vectors from SPEC.md Section 13.3

import { describe, it, expect } from 'vitest';
import {
  normalizeText,
  countGraphemes,
  extractLengthBit,
  extractMediaBit,
  extractQuestionBit,
  extractFirstWordBits,
  extractFeatures,
  type FeatureId
} from './features';

describe('normalizeText', () => {
  it('applies NFC normalization', () => {
    // NFD form of "é" (e + combining acute accent)
    const nfd = '\u0065\u0301';
    // NFC form of "é" (single character)
    const nfc = '\u00e9';

    expect(normalizeText(nfd)).toBe(nfc);
  });

  it('collapses consecutive whitespace', () => {
    expect(normalizeText('hello  world')).toBe('hello world');
    expect(normalizeText('hello   \t  world')).toBe('hello world');
    expect(normalizeText('hello\n\nworld')).toBe('hello world');
  });

  it('trims leading and trailing whitespace', () => {
    expect(normalizeText('  hello world  ')).toBe('hello world');
    expect(normalizeText('\thello world\n')).toBe('hello world');
  });

  it('handles combined normalization operations', () => {
    expect(normalizeText('  hello  \t world  ')).toBe('hello world');
  });
});

describe('countGraphemes', () => {
  it('counts basic ASCII characters', () => {
    expect(countGraphemes('hello')).toBe(5);
  });

  it('counts emoji as single grapheme clusters', () => {
    expect(countGraphemes('🌅')).toBe(1);
    expect(countGraphemes('🎉')).toBe(1);
  });

  it('counts complex emoji sequences correctly', () => {
    // Family emoji is a single grapheme cluster
    expect(countGraphemes('👨‍👩‍👧‍👦')).toBe(1);
  });

  it('counts text with emoji correctly', () => {
    expect(countGraphemes('Have you seen this amazing sunset? 🌅')).toBe(36);
  });
});

describe('extractLengthBit', () => {
  it('returns 0 when below threshold', () => {
    expect(extractLengthBit('I just finished reading a great book!', 50)).toBe(0);
  });

  it('returns 1 when at or above threshold', () => {
    expect(extractLengthBit('I just finished reading a great book!', 37)).toBe(1);
    expect(extractLengthBit('I just finished reading a great book!', 30)).toBe(1);
  });

  it('normalizes text before counting', () => {
    expect(extractLengthBit('  hello  world  ', 11)).toBe(1); // "hello world" = 11 chars
  });
});

describe('extractMediaBit', () => {
  it('returns 0 when no media', () => {
    expect(extractMediaBit(false)).toBe(0);
  });

  it('returns 1 when media present', () => {
    expect(extractMediaBit(true)).toBe(1);
  });
});

describe('extractQuestionBit', () => {
  it('returns 0 when no question mark', () => {
    expect(extractQuestionBit('I just finished reading a great book!')).toBe(0);
    expect(extractQuestionBit('Hello world')).toBe(0);
  });

  it('returns 1 when question mark present', () => {
    expect(extractQuestionBit('Have you seen this amazing sunset? 🌅')).toBe(1);
    expect(extractQuestionBit('Is this working?')).toBe(1);
  });
});

describe('extractFirstWordBits', () => {
  it('returns 0b00 for pronouns', () => {
    expect(extractFirstWordBits('I love this')).toBe(0b00);
    expect(extractFirstWordBits('i love this')).toBe(0b00); // Case-insensitive
    expect(extractFirstWordBits('We are here')).toBe(0b00);
    expect(extractFirstWordBits('you know what')).toBe(0b00);
    expect(extractFirstWordBits('I just finished reading a great book!')).toBe(0b00);
  });

  it('returns 0b01 for articles/determiners', () => {
    expect(extractFirstWordBits('The quick brown')).toBe(0b01);
    expect(extractFirstWordBits('the quick brown')).toBe(0b01); // Case-insensitive
    expect(extractFirstWordBits('A nice day')).toBe(0b01);
    expect(extractFirstWordBits('This is great')).toBe(0b01);
  });

  it('returns 0b10 for common verbs', () => {
    expect(extractFirstWordBits('Is this working?')).toBe(0b10);
    expect(extractFirstWordBits('Have you seen this amazing sunset? 🌅')).toBe(0b10);
    expect(extractFirstWordBits('Going to the store')).toBe(0b10);
    expect(extractFirstWordBits('Was it good?')).toBe(0b10);
  });

  it('returns 0b11 for other words', () => {
    expect(extractFirstWordBits('Running late today')).toBe(0b11);
    expect(extractFirstWordBits('Hello world')).toBe(0b11);
    expect(extractFirstWordBits('Amazing sunset')).toBe(0b11);
  });

  it('handles edge cases from SPEC.md Section 13.4', () => {
    expect(extractFirstWordBits('@alice hey there')).toBe(0b11);
    expect(extractFirstWordBits('#blessed morning')).toBe(0b11);
    expect(extractFirstWordBits('🎉 Celebrating!')).toBe(0b11);
    expect(extractFirstWordBits('https://example.com nice')).toBe(0b11);
  });

  it('handles emoji-only posts', () => {
    expect(extractFirstWordBits('🌅')).toBe(0b11);
  });
});

describe('extractFeatures', () => {
  describe('SPEC.md Section 13.3 test vector 1', () => {
    const text = 'I just finished reading a great book!';
    const hasMedia = false;
    const threshold = 50;

    it('extracts len=0, media=0, qmark=0 for feature set [len, media, qmark]', () => {
      const result = extractFeatures(text, hasMedia, ['len', 'media', 'qmark'], threshold);

      expect(result.bits).toEqual([0, 0, 0]);
      expect(result.bitCount).toBe(3);
    });

    it('extracts fword=0b00 when fword feature included', () => {
      const result = extractFeatures(text, hasMedia, ['len', 'media', 'qmark', 'fword'], threshold);

      // fword=0b00 for "I" (pronoun) = [0, 0] (high bit, low bit)
      expect(result.bits).toEqual([0, 0, 0, 0, 0]);
      expect(result.bitCount).toBe(5);
    });
  });

  describe('SPEC.md Section 13.3 test vector 2', () => {
    const text = 'Have you seen this amazing sunset? 🌅';
    const hasMedia = true;
    const threshold = 50;

    it('extracts len=0, media=1, qmark=1 for feature set [len, media, qmark]', () => {
      const result = extractFeatures(text, hasMedia, ['len', 'media', 'qmark'], threshold);

      expect(result.bits).toEqual([0, 1, 1]);
      expect(result.bitCount).toBe(3);
    });

    it('extracts fword=0b10 when fword feature included', () => {
      const result = extractFeatures(text, hasMedia, ['len', 'media', 'qmark', 'fword'], threshold);

      // fword=0b10 for "Have" (verb) = [1, 0] (high bit, low bit)
      expect(result.bits).toEqual([0, 1, 1, 1, 0]);
      expect(result.bitCount).toBe(5);
    });
  });

  it('handles different feature set orderings', () => {
    const text = 'Hello world?';
    const hasMedia = false;

    const result = extractFeatures(text, hasMedia, ['qmark', 'media', 'len'], 50);

    expect(result.bits).toEqual([1, 0, 0]); // qmark=1, media=0, len=0
    expect(result.bitCount).toBe(3);
  });

  it('handles single feature', () => {
    const text = 'Hello world?';
    const hasMedia = false;

    const result = extractFeatures(text, hasMedia, ['qmark'], 50);

    expect(result.bits).toEqual([1]);
    expect(result.bitCount).toBe(1);
  });

  it('throws error for unimplemented wcount feature', () => {
    const text = 'Hello world';
    const hasMedia = false;

    expect(() => {
      extractFeatures(text, hasMedia, ['wcount'], 50);
    }).toThrow('wcount feature not yet implemented');
  });

  it('throws error for unknown feature', () => {
    const text = 'Hello world';
    const hasMedia = false;

    expect(() => {
      extractFeatures(text, hasMedia, ['unknown' as FeatureId], 50);
    }).toThrow('Unknown feature: unknown');
  });
});
