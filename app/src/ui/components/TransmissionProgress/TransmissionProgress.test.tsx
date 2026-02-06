import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TransmissionProgress } from './TransmissionProgress';

const baseProps = {
  contactName: 'Alice',
  messagePreview: 'Hello world',
  bitsTotal: 100,
  bitsSent: 50,
  signalPostsUsed: 5,
  epochId: 'abc123',
  startedAt: Date.now() - 60_000,
  onCancel: vi.fn(),
  isComplete: false,
};

describe('TransmissionProgress', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('per-beacon grace period stats', () => {
    it('displays grace period for btc beacon (120s)', () => {
      const now = Date.now();
      render(
        <TransmissionProgress
          {...baseProps}
          beaconType="btc"
          epochExpiresAt={now + 300_000}
        />
      );

      expect(screen.getByText('Grace period:')).toBeTruthy();
      expect(screen.getByText('120s (btc)')).toBeTruthy();
    });

    it('displays grace period for nist beacon (30s)', () => {
      const now = Date.now();
      render(
        <TransmissionProgress
          {...baseProps}
          beaconType="nist"
          epochExpiresAt={now + 300_000}
        />
      );

      expect(screen.getByText('30s (nist)')).toBeTruthy();
    });

    it('displays grace period for date beacon (300s)', () => {
      const now = Date.now();
      render(
        <TransmissionProgress
          {...baseProps}
          beaconType="date"
          epochExpiresAt={now + 600_000}
        />
      );

      expect(screen.getByText('300s (date)')).toBeTruthy();
    });
  });

  describe('epoch approaching warning with beacon-aware thresholds', () => {
    it('shows warning for btc when within 60s (min of 60s and 120s grace)', () => {
      const now = Date.now();
      // 45s remaining -- within the 60s approach threshold (min(60000, 120000))
      render(
        <TransmissionProgress
          {...baseProps}
          beaconType="btc"
          epochExpiresAt={now + 45_000}
        />
      );

      // The epoch section should have the warning class
      const epochSection = document.querySelector('.transmission-progress__epoch--warning');
      expect(epochSection).toBeTruthy();
    });

    it('shows warning for nist when within 30s (min of 60s and 30s grace)', () => {
      const now = Date.now();
      // 20s remaining -- within the 30s approach threshold (min(60000, 30000))
      render(
        <TransmissionProgress
          {...baseProps}
          beaconType="nist"
          epochExpiresAt={now + 20_000}
        />
      );

      const epochSection = document.querySelector('.transmission-progress__epoch--warning');
      expect(epochSection).toBeTruthy();
    });

    it('does NOT show warning for nist at 40s (outside 30s grace threshold)', () => {
      const now = Date.now();
      // 40s remaining -- outside the 30s approach threshold for nist
      render(
        <TransmissionProgress
          {...baseProps}
          beaconType="nist"
          epochExpiresAt={now + 40_000}
        />
      );

      const epochSection = document.querySelector('.transmission-progress__epoch--warning');
      expect(epochSection).toBeFalsy();
    });
  });

  describe('grace period active indicator', () => {
    it('shows grace active indicator for btc when within 120s', () => {
      const now = Date.now();
      // 90s remaining -- within btc grace period of 120s
      render(
        <TransmissionProgress
          {...baseProps}
          beaconType="btc"
          epochExpiresAt={now + 90_000}
        />
      );

      const graceElement = document.querySelector('.transmission-progress__grace--active');
      expect(graceElement).toBeTruthy();
      expect(screen.getByText(/Grace period active/)).toBeTruthy();
    });

    it('shows grace active indicator for nist when within 30s', () => {
      const now = Date.now();
      // 15s remaining -- within nist grace period of 30s
      render(
        <TransmissionProgress
          {...baseProps}
          beaconType="nist"
          epochExpiresAt={now + 15_000}
        />
      );

      const graceElement = document.querySelector('.transmission-progress__grace--active');
      expect(graceElement).toBeTruthy();
    });

    it('does NOT show grace active indicator when outside grace period', () => {
      const now = Date.now();
      // 200s remaining -- outside btc grace period of 120s
      render(
        <TransmissionProgress
          {...baseProps}
          beaconType="btc"
          epochExpiresAt={now + 200_000}
        />
      );

      const graceElement = document.querySelector('.transmission-progress__grace--active');
      expect(graceElement).toBeFalsy();
    });

    it('shows grace active for date beacon when within 300s', () => {
      const now = Date.now();
      // 250s remaining -- within date grace period of 300s
      render(
        <TransmissionProgress
          {...baseProps}
          beaconType="date"
          epochExpiresAt={now + 250_000}
        />
      );

      const graceElement = document.querySelector('.transmission-progress__grace--active');
      expect(graceElement).toBeTruthy();
    });
  });

  describe('complete state', () => {
    it('shows completion message and hides grace/epoch elements', () => {
      const now = Date.now();
      render(
        <TransmissionProgress
          {...baseProps}
          beaconType="btc"
          epochExpiresAt={now + 10_000}
          isComplete={true}
        />
      );

      expect(screen.getByText('Message sent!')).toBeTruthy();
      // Grace indicator should not be present in complete state
      const graceElement = document.querySelector('.transmission-progress__grace--active');
      expect(graceElement).toBeFalsy();
    });
  });
});
