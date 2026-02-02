// Test suite for T2: Post Analysis Module
import { describe, it, expect } from 'vitest';
import {
  analyzePostFeatures,
  estimateSignalProbability,
  suggestModifications,
} from '../sender';

describe('Post Analysis Module (T2)', () => {
  describe('analyzePostFeatures', () => {
    it('should extract features from a short text-only post', () => {
      const result = analyzePostFeatures('Hello!', false);

      expect(result.len).toBe(0); // Short post (< 50 chars)
      expect(result.media).toBe(0); // No media
      expect(result.qmark).toBe(0); // No question mark
      expect(result.extractedBits).toEqual([0, 0, 0]);
    });

    it('should extract features from a long post with media and question', () => {
      const longText = 'This is a longer post that exceeds the median threshold of fifty characters. What do you think?';
      const result = analyzePostFeatures(longText, true);

      expect(result.len).toBe(1); // Long post (>= 50 chars)
      expect(result.media).toBe(1); // Has media
      expect(result.qmark).toBe(1); // Has question mark
      expect(result.extractedBits).toEqual([1, 1, 1]);
    });

    it('should detect question marks', () => {
      const result = analyzePostFeatures('Is this working?', false);

      expect(result.qmark).toBe(1);
    });
  });

  describe('estimateSignalProbability', () => {
    it('should return default selection rate of 0.25', () => {
      const result = estimateSignalProbability('Any text', false);

      expect(result.probability).toBe(0.25);
      expect(result.isLikely).toBe(true);
    });

    it('should accept custom selection rate', () => {
      const result = estimateSignalProbability('Any text', false, 0.5);

      expect(result.probability).toBe(0.5);
      expect(result.isLikely).toBe(true);
    });

    it('should mark low rates as not likely', () => {
      const result = estimateSignalProbability('Any text', false, 0.1);

      expect(result.probability).toBe(0.1);
      expect(result.isLikely).toBe(false);
    });
  });

  describe('suggestModifications', () => {
    it('should suggest making post longer', () => {
      const currentBits = [0, 0, 0];
      const targetBits = [1, 0, 0];

      const suggestions = suggestModifications(currentBits, targetBits);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].feature).toBe('len');
      expect(suggestions[0].currentValue).toBe(0);
      expect(suggestions[0].targetValue).toBe(1);
      expect(suggestions[0].suggestion).toContain('longer');
    });

    it('should suggest making post shorter', () => {
      const currentBits = [1, 0, 0];
      const targetBits = [0, 0, 0];

      const suggestions = suggestModifications(currentBits, targetBits);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].feature).toBe('len');
      expect(suggestions[0].suggestion).toContain('shorter');
    });

    it('should suggest adding media', () => {
      const currentBits = [0, 0, 0];
      const targetBits = [0, 1, 0];

      const suggestions = suggestModifications(currentBits, targetBits);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].feature).toBe('media');
      expect(suggestions[0].suggestion).toContain('Add an image');
    });

    it('should suggest removing media', () => {
      const currentBits = [0, 1, 0];
      const targetBits = [0, 0, 0];

      const suggestions = suggestModifications(currentBits, targetBits);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].feature).toBe('media');
      expect(suggestions[0].suggestion).toContain('Remove media');
    });

    it('should suggest adding question mark', () => {
      const currentBits = [0, 0, 0];
      const targetBits = [0, 0, 1];

      const suggestions = suggestModifications(currentBits, targetBits);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].feature).toBe('qmark');
      expect(suggestions[0].suggestion).toContain('question mark');
    });

    it('should suggest multiple modifications', () => {
      const currentBits = [0, 0, 0];
      const targetBits = [1, 1, 1];

      const suggestions = suggestModifications(currentBits, targetBits);

      expect(suggestions).toHaveLength(3);
      expect(suggestions[0].feature).toBe('len');
      expect(suggestions[1].feature).toBe('media');
      expect(suggestions[2].feature).toBe('qmark');
    });

    it('should return empty array when bits match', () => {
      const currentBits = [1, 0, 1];
      const targetBits = [1, 0, 1];

      const suggestions = suggestModifications(currentBits, targetBits);

      expect(suggestions).toHaveLength(0);
    });
  });
});
