# Cryptographic Core Module

Implementation of StegoChannel cryptographic primitives per SPEC.md.

## Implemented Functions

### Core Cryptographic Primitives

1. **initSodium()** - Initialize libsodium-wrappers
   - Must be called before using encryption functions
   - Returns sodium instance

2. **hkdfExpand(prk, info, length)** - HKDF-Expand per RFC 5869
   - Uses Web Crypto API for HMAC-SHA256
   - Standard HKDF-Expand implementation

3. **sha256(data)** - SHA-256 hash
   - Uses Web Crypto API
   - Returns 32-byte hash

4. **hmacSha256(key, message)** - HMAC-SHA256
   - Truncated to 64 bits (8 bytes) per SPEC Section 8.1
   - Used for message authentication

5. **xchachaPoly1305Encrypt(key, nonce, plaintext)** - Authenticated encryption
   - Uses libsodium's XChaCha20-Poly1305-IETF
   - 32-byte key, 24-byte nonce
   - Includes authentication tag

6. **xchachaPoly1305Decrypt(key, nonce, ciphertext)** - Authenticated decryption
   - Verifies authentication tag
   - Throws on decryption failure

7. **argon2id(password, salt, opsLimit, memLimit)** - Password-based key derivation
   - Uses libsodium's Argon2id implementation
   - Returns 32-byte key

8. **deriveEpochKey(channelKey, beaconId, beaconValue)** - Epoch key derivation
   - Per SPEC Section 5.1
   - `info = "beaconId:beaconValue:stegochannel-v0"`
   - Returns 32-byte epoch key

### Helper Functions

- **bytesToUint64BE(bytes)** - Convert 8 bytes to BigInt (big-endian)
- **uint64ToBytesBE(value)** - Convert BigInt to 8 bytes (big-endian)
- **hexToBytes(hex)** - Convert hex string to Uint8Array
- **bytesToHex(bytes)** - Convert Uint8Array to hex string
- **stringToBytes(str)** - UTF-8 string to Uint8Array
- **concat(...buffers)** - Concatenate multiple Uint8Array

## Test Vector Correction

**Important Note:** The test vectors in SPEC.md Section 13.1 appear to contain an error.

### SPEC Claims
```
channel_key = 0x0000...0001 (32 bytes)
info = "date:2025-02-01:stegochannel-v0"
epoch_key = 0x8b2c5a9f3d1e7b4a6c8f2d5e9a3b7c1d4f6e8a2b5c9d3e7f1a4b8c2d6e9f3a7b
```

### Actual Correct Value
```
epoch_key = 0xa317acc97f878f4098b4a1bb58570b06e41aa36615070d1ca8b3486cf2fbc3b3
```

### Verification
This implementation has been verified against:
- **Python cryptography library** (HKDFExpand)
- **Python standard library** (manual HKDF-Expand)
- **Node.js crypto** (manual HKDF-Expand)
- **RFC 5869** specification

All produce the same result: `a317acc9...`

### Impact on Dependent Test Vectors

With the corrected epoch key, dependent values in SPEC Section 13.2 and 13.5 also differ:

| Test Vector | SPEC Value | Corrected Value |
|-------------|------------|-----------------|
| Selection hash | `2a4e6c8f1b3d5a7e9c2f4d6b...` | `780d5f2b73e3caefb1c2199c...` |
| Selection value | `3049827156438219390` | `8650675099481131759` |
| Is signal post? | `true` (< threshold) | `false` (> threshold) |
| Auth tag | `3f7a2b9c5d1e4f8a` | `638125722a26a07b` |

Our test suite uses the **corrected** values verified by multiple independent implementations.

## Usage Example

```typescript
import { initSodium, deriveEpochKey, sha256, concat, stringToBytes, bytesToHex } from '@/core/crypto';

// Initialize libsodium
await initSodium();

// Derive epoch key
const channelKey = new Uint8Array(32); // Your 32-byte channel key
const epochKey = await deriveEpochKey(channelKey, 'date', '2025-02-01');

// Compute post selection hash
const postId = 'abc123xyz';
const input = concat(epochKey, stringToBytes(postId));
const selectionHash = await sha256(input);

console.log('Selection hash:', bytesToHex(selectionHash));
```

## Browser Compatibility

This module uses:
- Web Crypto API (for SHA-256, HMAC)
- libsodium-wrappers (for XChaCha20-Poly1305, Argon2id)

Both are widely supported in modern browsers and Node.js environments.
