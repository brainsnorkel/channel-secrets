import { describe, it, expect, beforeAll } from 'vitest';
import { initSodium } from '../crypto';
import { encodeFrame, decodeFrame } from './framing';

beforeAll(async () => {
  await initSodium();
});

describe('framing encryption', () => {
  // Generate a test epoch key (32 bytes)
  const epochKey = new Uint8Array(32);
  epochKey[0] = 0x42;
  epochKey[31] = 0xFF;

  const differentKey = new Uint8Array(32);
  differentKey[0] = 0x99;

  it('unencrypted frame round-trip still works', async () => {
    const payload = new TextEncoder().encode('hello world');
    const encoded = await encodeFrame(payload, epochKey, false, 0);
    const decoded = await decodeFrame(encoded, epochKey, 0);

    expect(decoded.valid).toBe(true);
    expect(decoded.encrypted).toBe(false);
    expect(new TextDecoder().decode(decoded.payload)).toBe('hello world');
  });

  it('encrypted frame round-trip works', async () => {
    const payload = new TextEncoder().encode('secret message');
    const encoded = await encodeFrame(payload, epochKey, true, 0);
    const decoded = await decodeFrame(encoded, epochKey, 0);

    expect(decoded.valid).toBe(true);
    expect(decoded.encrypted).toBe(true);
    expect(new TextDecoder().decode(decoded.payload)).toBe('secret message');
  });

  it('encrypted frame with empty payload works', async () => {
    const payload = new Uint8Array(0);
    const encoded = await encodeFrame(payload, epochKey, true, 0);
    const decoded = await decodeFrame(encoded, epochKey, 0);

    expect(decoded.valid).toBe(true);
    expect(decoded.encrypted).toBe(true);
    expect(decoded.payload.length).toBe(0);
  });

  it('decrypt with wrong key fails', async () => {
    const payload = new TextEncoder().encode('secret');
    const encoded = await encodeFrame(payload, epochKey, true, 0);
    const decoded = await decodeFrame(encoded, differentKey, 0);

    // HMAC auth check with wrong key should fail first
    expect(decoded.valid).toBe(false);
  });

  it('decrypt with wrong sequence number fails', async () => {
    const payload = new TextEncoder().encode('secret');
    const encoded = await encodeFrame(payload, epochKey, true, 0);
    // Decode with different seq num (different nonce)
    // The HMAC will still pass (it doesn't depend on seq num directly),
    // but decryption will fail due to wrong nonce
    const decoded = await decodeFrame(encoded, epochKey, 99);

    // Either HMAC fails or decryption fails
    expect(decoded.valid).toBe(false);
  });

  it('encrypted flag is set in header', async () => {
    const payload = new TextEncoder().encode('test');
    const encoded = await encodeFrame(payload, epochKey, true, 0);
    const decoded = await decodeFrame(encoded, epochKey, 0);

    expect(decoded.encrypted).toBe(true);
    expect(decoded.flags & 0x01).toBe(1);
  });

  it('different sequence numbers produce different ciphertexts', async () => {
    const payload = new TextEncoder().encode('same message');
    const encoded0 = await encodeFrame(payload, epochKey, true, 0);
    const encoded1 = await encodeFrame(payload, epochKey, true, 1);

    // Frames should differ (different nonces)
    expect(encoded0).not.toEqual(encoded1);

    // Both should decode correctly with their respective seq nums
    const decoded0 = await decodeFrame(encoded0, epochKey, 0);
    const decoded1 = await decodeFrame(encoded1, epochKey, 1);
    expect(decoded0.valid).toBe(true);
    expect(decoded1.valid).toBe(true);
  });
});
