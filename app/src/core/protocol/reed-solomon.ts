// Module: core/protocol/reed-solomon
// Reed-Solomon error correction for StegoChannel
// Implements SPEC.md Section 8.4

import { GenericGF, ReedSolomonEncoder, ReedSolomonDecoder } from './reedsolomon-shim';

/**
 * Reed-Solomon parameters (SPEC.md Section 8.4):
 * - Field: GF(2^8)
 * - Primitive polynomial: 0x11d (x^8 + x^4 + x^3 + x^2 + 1)
 * - Generator roots: consecutive starting at α^0
 * - Block size: n = 255
 * - Default ECC symbols: 8 (appended to message)
 * - Max correctable errors: 4 symbols (with 8 ECC symbols)
 */

const DEFAULT_ECC_SYMBOLS = 8;

/**
 * Encode message with Reed-Solomon error correction.
 *
 * Uses GF(2^8) with primitive polynomial 0x11d, compatible with QR codes.
 * ECC symbols are appended to the message data.
 *
 * @param data - Message data to encode
 * @param eccSymbols - Number of error correction symbols to append (default: 8)
 * @returns Encoded data with ECC symbols appended (length = data.length + eccSymbols)
 *
 * @example
 * ```typescript
 * const message = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]); // "Hello"
 * const encoded = rsEncode(message, 8);
 * // encoded.length === message.length + 8
 * ```
 */
export function rsEncode(data: Uint8Array, eccSymbols: number = DEFAULT_ECC_SYMBOLS): Uint8Array {
  if (data.length === 0) {
    throw new Error('Cannot encode empty data');
  }

  if (eccSymbols < 2 || eccSymbols > 255) {
    throw new Error('ECC symbols must be between 2 and 255');
  }

  if (data.length + eccSymbols > 255) {
    throw new Error(`Data length (${data.length}) + ECC symbols (${eccSymbols}) exceeds RS block size (255)`);
  }

  // Create encoder with QR_CODE_FIELD_256 (primitive polynomial 0x11d)
  const field = GenericGF.QR_CODE_FIELD_256();
  const encoder = new ReedSolomonEncoder(field);

  // Copy data to Int32Array (required by reedsolomon library)
  // The library expects an array of size (data.length + eccSymbols)
  // and will fill the last eccSymbols positions with parity symbols
  const toEncode = new Int32Array(data.length + eccSymbols);
  for (let i = 0; i < data.length; i++) {
    toEncode[i] = data[i];
  }

  // Encode in-place: appends ECC symbols to the end
  encoder.encode(toEncode, eccSymbols);

  // Convert back to Uint8Array
  const result = new Uint8Array(toEncode.length);
  for (let i = 0; i < toEncode.length; i++) {
    result[i] = toEncode[i] & 0xFF;
  }

  return result;
}

/**
 * Decode and correct errors in Reed-Solomon encoded data.
 *
 * Returns the original message data (without ECC symbols) if decoding succeeds.
 * Throws an error if there are too many errors to correct.
 *
 * @param encoded - Encoded data including ECC symbols
 * @param eccSymbols - Number of error correction symbols appended (default: 8)
 * @returns Corrected message data (without ECC symbols)
 * @throws Error if too many errors to correct
 *
 * @example
 * ```typescript
 * const encoded = rsEncode(message, 8);
 * // ... transmission or storage ...
 * const decoded = rsDecode(encoded, 8);
 * // decoded equals original message
 * ```
 */
export function rsDecode(encoded: Uint8Array, eccSymbols: number = DEFAULT_ECC_SYMBOLS): Uint8Array {
  if (encoded.length === 0) {
    throw new Error('Cannot decode empty data');
  }

  if (eccSymbols < 2 || eccSymbols > 255) {
    throw new Error('ECC symbols must be between 2 and 255');
  }

  if (encoded.length <= eccSymbols) {
    throw new Error(`Encoded length (${encoded.length}) must be greater than ECC symbols (${eccSymbols})`);
  }

  if (encoded.length > 255) {
    throw new Error(`Encoded length (${encoded.length}) exceeds RS block size (255)`);
  }

  // Create decoder with QR_CODE_FIELD_256 (primitive polynomial 0x11d)
  const field = GenericGF.QR_CODE_FIELD_256();
  const decoder = new ReedSolomonDecoder(field);

  // Copy encoded data to Int32Array
  const toDecode = new Int32Array(encoded.length);
  for (let i = 0; i < encoded.length; i++) {
    toDecode[i] = encoded[i];
  }

  // Decode in-place: corrects errors if possible
  // Returns the number of errors corrected, or throws if too many errors
  try {
    decoder.decode(toDecode, eccSymbols);
  } catch (error) {
    throw new Error(`Reed-Solomon decoding failed: too many errors to correct (${error})`);
  }

  // Extract the message data (without ECC symbols)
  const messageLength = encoded.length - eccSymbols;
  const result = new Uint8Array(messageLength);
  for (let i = 0; i < messageLength; i++) {
    result[i] = toDecode[i] & 0xFF;
  }

  return result;
}
