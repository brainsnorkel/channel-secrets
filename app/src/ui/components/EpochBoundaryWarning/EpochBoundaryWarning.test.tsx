import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EpochBoundaryWarning } from './EpochBoundaryWarning';

describe('EpochBoundaryWarning', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('visibility based on grace period', () => {
    it('renders when within btc grace period (120s)', () => {
      const now = Date.now();
      // 90s remaining -- within btc grace of 120s
      render(
        <EpochBoundaryWarning beaconType="btc" epochExpiresAt={now + 90_000} />
      );

      expect(screen.getByText('Epoch boundary approaching')).toBeTruthy();
      expect(screen.getByText(/120s for btc/)).toBeTruthy();
    });

    it('renders when within nist grace period (30s)', () => {
      const now = Date.now();
      // 20s remaining -- within nist grace of 30s
      render(
        <EpochBoundaryWarning beaconType="nist" epochExpiresAt={now + 20_000} />
      );

      expect(screen.getByText('Epoch boundary approaching')).toBeTruthy();
      expect(screen.getByText(/30s for nist/)).toBeTruthy();
    });

    it('renders when within date grace period (300s)', () => {
      const now = Date.now();
      // 200s remaining -- within date grace of 300s
      render(
        <EpochBoundaryWarning beaconType="date" epochExpiresAt={now + 200_000} />
      );

      expect(screen.getByText('Epoch boundary approaching')).toBeTruthy();
      expect(screen.getByText(/300s for date/)).toBeTruthy();
    });

    it('does NOT render when outside grace period', () => {
      const now = Date.now();
      // 500s remaining -- outside btc grace of 120s
      const { container } = render(
        <EpochBoundaryWarning beaconType="btc" epochExpiresAt={now + 500_000} />
      );

      expect(container.querySelector('.epoch-boundary-warning')).toBeFalsy();
    });

    it('does NOT render when epoch has expired (timeLeft = 0)', () => {
      const now = Date.now();
      // Already expired
      const { container } = render(
        <EpochBoundaryWarning beaconType="btc" epochExpiresAt={now - 1000} />
      );

      expect(container.querySelector('.epoch-boundary-warning')).toBeFalsy();
    });
  });

  describe('content', () => {
    it('mentions transmission may span two epochs', () => {
      const now = Date.now();
      render(
        <EpochBoundaryWarning beaconType="btc" epochExpiresAt={now + 60_000} />
      );

      expect(screen.getByText(/Transmission may span two epochs/)).toBeTruthy();
    });

    it('displays the correct grace period value per beacon type', () => {
      const now = Date.now();

      // nist = 30s
      const { unmount } = render(
        <EpochBoundaryWarning beaconType="nist" epochExpiresAt={now + 15_000} />
      );
      expect(screen.getByText(/30s for nist/)).toBeTruthy();
      unmount();

      // date = 300s
      render(
        <EpochBoundaryWarning beaconType="date" epochExpiresAt={now + 100_000} />
      );
      expect(screen.getByText(/300s for date/)).toBeTruthy();
    });
  });

  describe('BEM structure', () => {
    it('uses epoch-boundary-warning BEM block', () => {
      const now = Date.now();
      const { container } = render(
        <EpochBoundaryWarning beaconType="btc" epochExpiresAt={now + 60_000} />
      );

      expect(container.querySelector('.epoch-boundary-warning')).toBeTruthy();
      expect(container.querySelector('.epoch-boundary-warning__icon')).toBeTruthy();
      expect(container.querySelector('.epoch-boundary-warning__content')).toBeTruthy();
      expect(container.querySelector('.epoch-boundary-warning__title')).toBeTruthy();
      expect(container.querySelector('.epoch-boundary-warning__detail')).toBeTruthy();
    });
  });
});
