// Tests for core/sender/sender-utils
// Verifies UI helper functions for post composition feedback

import { describe, it, expect } from 'vitest';
import { analyzePostFeatures, estimateSignalProbability, suggestModifications } from './sender-utils';

describe('analyzePostFeatures', () => {
  it('returns correct features for short text without media or question', () => {
    const result = analyzePostFeatures('Hi there', false);

    expect(result.len).toBe(0); // < 50 chars
    expect(result.media).toBe(0); // no media
    expect(result.qmark).toBe(0); // no question mark
    expect(result.extractedBits).toEqual([0, 0, 0]);
  });

  it('returns len=1 for text >= 50 characters', () => {
    const longText = 'This is a post that is definitely longer than fifty characters in total length.';
    const result = analyzePostFeatures(longText, false);

    expect(result.len).toBe(1);
  });

  it('returns media=1 when hasMedia is true', () => {
    const result = analyzePostFeatures('short', true);

    expect(result.media).toBe(1);
  });

  it('returns qmark=1 when text contains question mark', () => {
    const result = analyzePostFeatures('Is this working?', false);

    expect(result.qmark).toBe(1);
  });

  it('returns all 1s for long text with media and question mark', () => {
    const longQuestion = 'This is a very long question that definitely exceeds fifty characters, right?';
    const result = analyzePostFeatures(longQuestion, true);

    expect(result.len).toBe(1);
    expect(result.media).toBe(1);
    expect(result.qmark).toBe(1);
    expect(result.extractedBits).toEqual([1, 1, 1]);
  });

  it('extractedBits has exactly 3 elements', () => {
    const result = analyzePostFeatures('any text', false);
    expect(result.extractedBits).toHaveLength(3);
  });
});

describe('estimateSignalProbability', () => {
  it('returns selection rate as probability', () => {
    const result = estimateSignalProbability('any text', false, 0.25);

    expect(result.probability).toBe(0.25);
    expect(result.isLikely).toBe(true); // 0.25 >= 0.25
  });

  it('returns isLikely=false for rate below 0.25', () => {
    const result = estimateSignalProbability('text', false, 0.1);

    expect(result.probability).toBe(0.1);
    expect(result.isLikely).toBe(false);
  });

  it('defaults to 0.25 selection rate', () => {
    const result = estimateSignalProbability('text', false);

    expect(result.probability).toBe(0.25);
  });

  it('returns isLikely=true for higher rates', () => {
    const result = estimateSignalProbability('text', false, 0.5);

    expect(result.probability).toBe(0.5);
    expect(result.isLikely).toBe(true);
  });
});

describe('suggestModifications', () => {
  it('generates suggestions for feature mismatches', () => {
    // Current: [0, 0, 0], Target: [1, 1, 1]
    const suggestions = suggestModifications([0, 0, 0], [1, 1, 1]);

    expect(suggestions).toHaveLength(3);

    // len suggestion
    expect(suggestions[0].feature).toBe('len');
    expect(suggestions[0].currentValue).toBe(0);
    expect(suggestions[0].targetValue).toBe(1);
    expect(suggestions[0].suggestion).toContain('longer');

    // media suggestion
    expect(suggestions[1].feature).toBe('media');
    expect(suggestions[1].suggestion).toContain('Add');

    // qmark suggestion
    expect(suggestions[2].feature).toBe('qmark');
    expect(suggestions[2].suggestion).toContain('question mark');
  });

  it('returns empty array when all bits match', () => {
    const suggestions = suggestModifications([1, 0, 1], [1, 0, 1]);

    expect(suggestions).toHaveLength(0);
  });

  it('suggests making post shorter when len needs to be 0', () => {
    const suggestions = suggestModifications([1, 0, 0], [0, 0, 0]);

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].feature).toBe('len');
    expect(suggestions[0].suggestion).toContain('shorter');
  });

  it('suggests removing media when media needs to be 0', () => {
    const suggestions = suggestModifications([0, 1, 0], [0, 0, 0]);

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].feature).toBe('media');
    expect(suggestions[0].suggestion).toContain('Remove');
  });

  it('suggests removing question marks when qmark needs to be 0', () => {
    const suggestions = suggestModifications([0, 0, 1], [0, 0, 0]);

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].feature).toBe('qmark');
    expect(suggestions[0].suggestion).toContain('Remove question marks');
  });

  it('handles partial mismatches', () => {
    // Only media differs
    const suggestions = suggestModifications([1, 0, 1], [1, 1, 1]);

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].feature).toBe('media');
  });
});
