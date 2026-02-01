# StegoChannel Protocol Specification

**Version:** 0.1.0-draft  
**Status:** Experimental  
**Licence:** CC0 1.0 Universal (Public Domain)

## Abstract

StegoChannel is a steganographic communication protocol enabling covert message transmission through public social media posts. The protocol uses hash-gated post selection combined with feature extraction to embed and recover messages without modifying the sender's natural writing style.

Security relies solely on a shared secret key. Knowledge of the protocol without the key reveals no information about whether communication is occurring or its contents.

---

## 1. Design Principles

1. **Kerckhoffs's Principle**: Security derives entirely from key secrecy, not protocol secrecy
2. **Natural cover traffic**: Sender posts normally; message is encoded in *selection*, not *modification*
3. **Plausible deniability**: Without the key, existence of communication cannot be proven
4. **Platform agnostic**: Designed for any platform with public timestamped posts (Bluesky, Mastodon, X, etc.)

---

## 2. Terminology

| Term | Definition |
|------|------------|
| **Sender** | Party transmitting covert message |
| **Receiver** | Party recovering covert message |
| **Cover post** | Any post by sender (natural content) |
| **Signal post** | Cover post selected to carry message bits |
| **Beacon** | Public randomness source for key derivation |
| **Epoch** | Time window sharing a single beacon value |
| **Channel key (K)** | Shared secret between sender and receiver |
| **Epoch key (Ke)** | Derived key for a specific epoch |

---

## 3. Cryptographic Primitives

All implementations MUST support:

| Function | Algorithm | Notes |
|----------|-----------|-------|
| Hash | SHA-256 | For key derivation and selection |
| KDF | HKDF-SHA256 | RFC 5869 |
| PRNG | ChaCha20 | Keystream generation |
| Optional encryption | XChaCha20-Poly1305 | Message confidentiality |

---

## 4. Public Beacon Sources

Implementations SHOULD support at least one of:

| Beacon ID | Source | Epoch duration | Value derivation |
|-----------|--------|----------------|------------------|
| `btc` | Bitcoin blockchain | ~10 min (1 block) | Block hash (hex) |
| `nist` | NIST Randomness Beacon | 1 minute | outputValue field |
| `date` | Calendar date | 24 hours (UTC) | ISO 8601 date string |

Custom beacons MAY be defined with format: `custom:<name>:<epoch_duration_seconds>`

---

## 5. Key Derivation

### 5.1 Epoch Key Derivation

```
beacon_value = fetch_beacon(beacon_id, current_epoch)
epoch_key = HKDF-Expand(
    key = channel_key,
    info = beacon_id || ":" || beacon_value || ":stegochannel-v0",
    length = 32
)
```

### 5.2 Post Selection Key

For each post with unique identifier `post_id`:

```
selection_hash = SHA256(epoch_key || post_id)
selection_value = bytes_to_uint64(selection_hash[0:8])
```

---

## 6. Post Selection

### 6.1 Selection Threshold

The selection threshold determines what fraction of posts carry signal:

```
threshold = (2^64 - 1) * selection_rate
```

Where `selection_rate` is a protocol parameter (default: 0.25, meaning ~25% of posts are signal posts).

A post is a **signal post** if:
```
selection_value < threshold
```

### 6.2 Selection Rate Considerations

| Rate | Capacity | Detectability risk |
|------|----------|-------------------|
| 0.10 | Low | Very low |
| 0.25 | Medium | Low |
| 0.50 | High | Medium |

Higher rates increase capacity but may create detectable patterns if post rate is low.

---

## 7. Feature Extraction

Signal posts are quantised into symbols using feature extraction.

### 7.1 Standard Feature Set

Each feature maps to one or more bits:

| Feature ID | Feature | Quantisation | Bits |
|------------|---------|--------------|------|
| `len` | Post length (chars) | Threshold at median | 1 |
| `media` | Contains media/link | Boolean | 1 |
| `qmark` | Contains question mark | Boolean | 1 |
| `fword` | First word category | See 7.2 | 2 |
| `wcount` | Word count | Quartiles | 2 |

Default feature set: `["len", "media", "qmark"]` = 3 bits per signal post

### 7.2 First Word Categories

| Category | Value | Examples |
|----------|-------|----------|
| Pronoun | 0b00 | I, we, you, they, it |
| Article/determiner | 0b01 | the, a, this, that |
| Verb | 0b10 | is, got, went, thinking |
| Other | 0b11 | all others |

### 7.3 Threshold Calibration

Feature thresholds SHOULD be calibrated per-sender to their posting history:

```
len_threshold = median(sender_post_lengths[-100:])
```

If insufficient history, use platform defaults.

---

## 8. Message Encoding

### 8.1 Message Frame Format

```
+----------+----------+----------+----------+
| Version  | Flags    | Length   | Payload  | Auth tag |
| 4 bits   | 4 bits   | 16 bits  | variable | 64 bits  |
+----------+----------+----------+----------+----------+
```

**Version:** `0x0` for this spec  
**Flags:**
- Bit 0: Encrypted (1) / Plaintext (0)
- Bit 1: Compressed (1) / Raw (0)
- Bits 2-3: Reserved

**Length:** Payload length in bits  
**Payload:** Message content  
**Auth tag:** Truncated HMAC-SHA256(epoch_key, version || flags || length || payload)

### 8.2 Encryption (Optional)

If encrypted flag set:
```
nonce = SHA256(epoch_key || "nonce" || message_sequence_number)[0:24]
ciphertext = XChaCha20-Poly1305(epoch_key, nonce, plaintext)
```

### 8.3 Error Correction

Messages SHOULD include Reed-Solomon error correction:

```
protected_message = RS_encode(message_frame, ecc_symbols=8)
```

This allows recovery with up to 4 corrupted symbols.

---

## 9. Transmission Protocol

### 9.1 Sender Procedure

1. Compose message M
2. Encode message frame F
3. Convert F to bit sequence B
4. Maintain natural posting cadence
5. For each new post P:
   - Compute selection_value for P
   - If signal post:
     - Extract features → symbol S
     - If S matches next required bits in B:
       - Publish P
       - Advance position in B
     - Else:
       - Discard or save P for later
   - If cover post:
     - Publish P freely

### 9.2 Receiver Procedure

1. Monitor sender's public posts
2. Fetch current beacon value
3. For each post P:
   - Compute selection_value for P
   - If signal post:
     - Extract features → symbol S
     - Append S to received bit buffer
4. Attempt message frame decode
5. Verify auth tag
6. If valid, output message

### 9.3 Synchronisation

The receiver continuously attempts decoding using a sliding window. Message start is detected via:

1. Valid version field
2. Consistent flag values
3. Length field producing valid auth tag at expected position

---

## 10. Channel Establishment

### 10.1 Pre-Shared Key

Parties exchange `channel_key` via secure out-of-band channel.

Key format:
```
stegochannel:v0:<base64url(channel_key)>:<beacon_id>:<selection_rate>:<feature_set>
```

Example:
```
stegochannel:v0:K7gNU3sdo-OL0wNhgC2d76:btc:0.25:len,media,qmark
```

### 10.2 ECDH Establishment (Optional)

If both parties have published public keys (cryptocurrency addresses, PGP, etc.):

```
shared_secret = ECDH(sender_private, receiver_public)
channel_key = HKDF-Extract(salt="stegochannel-v0-ecdh", ikm=shared_secret)
```

---

## 11. Security Considerations

### 11.1 Threat Model

**Protected against:**
- Passive observation of post content
- Statistical analysis of post timing/content without key
- Platform-level surveillance
- Compelled disclosure (deniability)

**Not protected against:**
- Key compromise
- Endpoint compromise (device access)
- Sender confirming communication under coercion

### 11.2 Traffic Analysis Resistance

Senders SHOULD:
- Maintain consistent posting frequency
- Not alter posting patterns when sending messages
- Continue cover posts during and after message completion

### 11.3 Forward Secrecy

For forward secrecy, derive per-message keys:

```
message_key = HKDF(epoch_key, "message" || message_sequence_number)
channel_key = SHA256(channel_key || "ratchet")  // Update after each message
```

---

## 12. Implementation Notes

### 12.1 Bit Rate Estimation

```
bits_per_day = posts_per_day × selection_rate × bits_per_post
```

Example: 10 posts/day × 0.25 × 3 bits = 7.5 bits/day ≈ 1 byte/day

### 12.2 Recommended Parameters

| Use case | Selection rate | Features | Approx. capacity |
|----------|---------------|----------|------------------|
| Maximum stealth | 0.10 | 3 | ~3 bits/day |
| Balanced | 0.25 | 3 | ~8 bits/day |
| Higher throughput | 0.50 | 5 | ~25 bits/day |

### 12.3 Platform-Specific Considerations

| Platform | Post ID format | Notes |
|----------|---------------|-------|
| Bluesky | AT URI (at://...) | Use rkey component |
| Mastodon | Numeric ID | Instance-specific |
| X/Twitter | Numeric snowflake | Includes timestamp |

---

## 13. Test Vectors

### 13.1 Key Derivation

```
channel_key = 0x0000000000000000000000000000000000000000000000000000000000000001
beacon_id = "date"
beacon_value = "2025-02-01"
epoch_key = HKDF-Expand(channel_key, "date:2025-02-01:stegochannel-v0", 32)
         = 0x7a3f... (implementation to verify)
```

### 13.2 Post Selection

```
epoch_key = 0x7a3f...
post_id = "3jxyz123abc"
selection_hash = SHA256(epoch_key || post_id)
selection_value = 0x... 
threshold (0.25) = 0x3FFFFFFFFFFFFFFF
selected = (selection_value < threshold)
```

---

## 14. References

1. RFC 5869 - HKDF
2. RFC 8439 - ChaCha20-Poly1305
3. NIST SP 800-90B - Randomness Beacon
4. Anderson, R. & Petitcolas, F. (1998) "On the Limits of Steganography"

---

## Appendix A: URI Scheme

```
stegochannel://<sender_handle>@<platform>?k=<key>&b=<beacon>&r=<rate>&f=<features>
```

## Appendix B: Changelog

- 0.1.0-draft: Initial specification
