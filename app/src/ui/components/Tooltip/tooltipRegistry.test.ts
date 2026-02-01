// Tests for tooltip registry

import { describe, it, expect } from 'vitest';
import { TOOLTIP_CONTENT, getTooltipContent, hasTooltip, type TooltipId } from './tooltipRegistry';

describe('tooltipRegistry', () => {
  describe('TOOLTIP_CONTENT', () => {
    it('contains required tooltip IDs', () => {
      const requiredIds: TooltipId[] = [
        'signal-post',
        'cover-post',
        'feature-bits',
        'epoch',
        'beacon',
        'threshold',
      ];

      for (const id of requiredIds) {
        expect(TOOLTIP_CONTENT[id]).toBeDefined();
      }
    });

    it('each tooltip has short and long text', () => {
      for (const [, content] of Object.entries(TOOLTIP_CONTENT)) {
        expect(content.short).toBeDefined();
        expect(content.short.length).toBeGreaterThan(0);
        expect(content.long).toBeDefined();
        expect(content.long.length).toBeGreaterThan(0);
        // Long should be longer than short
        expect(content.long.length).toBeGreaterThanOrEqual(content.short.length);
      }
    });

    it('each tooltip with specRef has valid format', () => {
      for (const [, content] of Object.entries(TOOLTIP_CONTENT)) {
        if (content.specRef) {
          // Should be a section reference like "§6.2" or "§8"
          expect(content.specRef).toMatch(/^§[\d.]+$/);
        }
      }
    });
  });

  describe('getTooltipContent', () => {
    it('returns content for valid tooltip ID', () => {
      const content = getTooltipContent('signal-post');
      expect(content).toBeDefined();
      expect(content?.short).toBeDefined();
      expect(content?.long).toBeDefined();
    });

    it('returns undefined for invalid tooltip ID', () => {
      // @ts-expect-error Testing invalid input
      const content = getTooltipContent('invalid-id');
      expect(content).toBeUndefined();
    });
  });

  describe('hasTooltip', () => {
    it('returns true for valid tooltip ID', () => {
      expect(hasTooltip('signal-post')).toBe(true);
      expect(hasTooltip('cover-post')).toBe(true);
      expect(hasTooltip('feature-bits')).toBe(true);
    });

    it('returns false for invalid tooltip ID', () => {
      expect(hasTooltip('invalid-id')).toBe(false);
      expect(hasTooltip('')).toBe(false);
    });
  });
});
