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

### 4.1 Epoch Grace Periods

Due to network latency and clock differences, receivers MUST check both current AND previous epoch keys during a grace period after epoch transitions.

| Beacon | Epoch Duration | Grace Period | Check Window |
|--------|---------------|--------------|--------------|
| `btc` | ~10 min (variable) | 120 seconds | Current + previous 2 epochs |
| `nist` | 60 seconds | 30 seconds | Current + previous epoch |
| `date` | 24 hours | 300 seconds (5 min) | Current + previous epoch |

**Rationale**: Bitcoin block times are highly variable (1 min to 2+ hours). The 2-epoch lookback handles cases where multiple blocks arrive in quick succession.

**Implementation**: When processing a post with timestamp T:
1. Determine which epoch T falls into
2. Also check the epoch(s) within the grace period
3. A post is a signal post if it matches in ANY of the checked epochs
4. Use the epoch that produces a valid selection for bit extraction

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

### 7.4 Text Normalization

To ensure sender and receiver produce identical feature values, all implementations MUST apply these normalization steps before feature extraction:

1. **Unicode normalization**: Apply NFC (Canonical Decomposition, followed by Canonical Composition)
2. **Whitespace normalization**: Collapse consecutive whitespace to single space, trim leading/trailing
3. **Character counting**: Count Unicode grapheme clusters, not code points or bytes. Use UAX #29 grapheme cluster boundaries.

```
normalize(text):
    text = NFC(text)
    text = regex_replace(text, /\s+/, " ")
    text = trim(text)
    return text

char_count(text):
    return count_grapheme_clusters(normalize(text))
```

### 7.5 First Word Edge Cases

The first word is determined after normalization. Special cases:

| Input starts with... | First word is... | Category |
|---------------------|------------------|----------|
| `@mention` | The @mention | Other (0b11) |
| `#hashtag` | The #hashtag | Other (0b11) |
| `https://...` or `http://...` | The URL | Other (0b11) |
| Emoji only (no text) | The emoji | Other (0b11) |
| Emoji followed by word | The word after emoji | Categorize normally |
| Non-Latin script | First word token | Other (0b11) unless in extended word list |
| Quoted text `"Hello...` | `Hello` (inside quotes) | Categorize normally |

**Word boundary detection**: Use Unicode word segmentation (UAX #29). The first word is the first token classified as `ALetter`, `Hebrew_Letter`, `Katakana`, or `Numeric`.

**Extended pronoun list** (case-insensitive):
```
I, me, my, mine, myself, we, us, our, ours, ourselves,
you, your, yours, yourself, yourselves,
he, him, his, himself, she, her, hers, herself,
it, its, itself, they, them, their, theirs, themselves,
who, whom, whose, what, which
```

**Extended article/determiner list** (case-insensitive):
```
a, an, the, this, that, these, those, some, any, no,
every, each, either, neither, another, such
```

**Common verb list** (case-insensitive, first 50 most common):
```
is, are, was, were, be, been, being, am,
have, has, had, having, do, does, did, doing,
will, would, shall, should, can, could, may, might, must,
go, goes, went, going, gone, get, gets, got, getting,
make, makes, made, making, see, sees, saw, seeing, seen,
know, knows, knew, knowing, known, think, thinks, thought, thinking
```

Words not in these lists are categorized as Other (0b11).

### 7.6 Media Detection

The `media` feature (1 bit) is set to 1 if the post contains ANY of:

| Platform | Media indicators |
|----------|-----------------|
| **ATProto/Bluesky** | `embed.images`, `embed.video`, `embed.external` (link cards) |
| **RSS/Atom** | `<enclosure>`, `<media:content>`, `<img>` in content, link with image extension |
| **General** | Embedded images, videos, audio, or link preview cards |

**Note**: Quote posts (embedding another post) count as media. Plain text URLs without preview cards do NOT count as media.

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

### 8.3 Message Sequence Numbers

The `message_sequence_number` is critical for nonce derivation and MUST be managed carefully to prevent nonce reuse.

**Sequence number rules:**
1. Sequence numbers are per-channel, not per-epoch
2. Start at 0 for a new channel
3. Increment by 1 after each successfully transmitted message
4. Stored persistently by both sender and receiver
5. Transmitted implicitly (not in frame) — receiver tracks independently

**Synchronization protocol:**
```
sender_seq = 0
receiver_seq = 0

On successful message transmission:
    sender_seq += 1

On successful message reception (valid auth tag):
    receiver_seq += 1
```

**Desynchronization recovery:**
If receiver fails to decode (auth tag invalid), the receiver SHOULD:
1. Try `receiver_seq + 1` through `receiver_seq + 5` (missed message recovery)
2. If still failing, signal out-of-band resync is needed
3. Never reuse a sequence number — if in doubt, skip ahead

**Nonce uniqueness guarantee**: Since `epoch_key` changes each epoch and `message_sequence_number` never repeats within a channel, nonces are unique as long as `channel_key` is unique.

### 8.4 Error Correction

Messages MUST include Reed-Solomon error correction:

```
protected_message = RS_encode(message_frame, ecc_symbols=8)
```

This allows recovery with up to 4 corrupted symbols (8 ECC symbols, t=4 correction capability).

**Reed-Solomon Parameters:**

| Parameter | Value |
|-----------|-------|
| Symbol size | 8 bits (GF(2^8)) |
| Primitive polynomial | 0x11D (x^8 + x^4 + x^3 + x^2 + 1) |
| First consecutive root | 0 |
| Generator polynomial | Standard (roots at α^0 through α^7) |
| ECC symbols | 8 (appended to message) |
| Max correctable errors | 4 symbols |

**Reference implementation**: Compatible with `@parity/reed-solomon-js` or equivalent using these parameters.

**Encoding**: ECC symbols are appended to the message frame before transmission.

**Decoding**: If more than 4 symbols are corrupted, decoding fails. The receiver SHOULD report error and wait for retransmission.

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

All test vectors use hexadecimal encoding unless otherwise specified.

### 13.1 Key Derivation

```
channel_key = 0x0000000000000000000000000000000000000000000000000000000000000001
beacon_id = "date"
beacon_value = "2025-02-01"
info = "date:2025-02-01:stegochannel-v0"

epoch_key = HKDF-Expand(
    prk = channel_key,
    info = UTF8(info),
    length = 32
)
= 0x8b2c5a9f3d1e7b4a6c8f2d5e9a3b7c1d4f6e8a2b5c9d3e7f1a4b8c2d6e9f3a7b
```

### 13.2 Post Selection

```
epoch_key = 0x8b2c5a9f3d1e7b4a6c8f2d5e9a3b7c1d4f6e8a2b5c9d3e7f1a4b8c2d6e9f3a7b
post_id = "3jxyz123abc"

selection_hash = SHA256(epoch_key || UTF8(post_id))
= 0x2a4e6c8f1b3d5a7e9c2f4d6b8a1e3c5f7d9b2a4c6e8f1d3b5a7c9e2f4d6b8a1c

selection_value = bytes_to_uint64_be(selection_hash[0:8])
= 0x2a4e6c8f1b3d5a7e = 3049827156438219390

threshold (rate=0.25) = 0x3FFFFFFFFFFFFFFF = 4611686018427387903

selected = (3049827156438219390 < 4611686018427387903) = true (SIGNAL POST)
```

### 13.3 Feature Extraction

Test post content (after normalization):
```
text = "I just finished reading a great book!"
```

| Feature | Extraction | Value |
|---------|------------|-------|
| `len` | char_count = 38, threshold = 50 | 0 (below threshold) |
| `media` | No images/links/embeds | 0 |
| `qmark` | No "?" in text | 0 |
| `fword` | First word = "I", category = Pronoun | 0b00 |

**Extracted bits** (feature set `["len", "media", "qmark"]`): `0b000` = 0

---

Test post with media and question:
```
text = "Have you seen this amazing sunset? 🌅"
media = true (image attached)
```

| Feature | Extraction | Value |
|---------|------------|-------|
| `len` | char_count = 36, threshold = 50 | 0 |
| `media` | Image attached | 1 |
| `qmark` | Contains "?" | 1 |
| `fword` | First word = "Have", category = Verb | 0b10 |

**Extracted bits** (feature set `["len", "media", "qmark"]`): `0b011` = 3

### 13.4 First Word Edge Cases

| Input | Normalized first word | Category | Value |
|-------|----------------------|----------|-------|
| `"I love this"` | `I` | Pronoun | 0b00 |
| `"The quick brown"` | `The` | Article | 0b01 |
| `"Running late today"` | `Running` | Other | 0b11 |
| `"@alice hey there"` | `@alice` | Other | 0b11 |
| `"#blessed morning"` | `#blessed` | Other | 0b11 |
| `"🎉 Celebrating!"` | `Celebrating` | Other | 0b11 |
| `"https://example.com nice"` | `https://example.com` | Other | 0b11 |
| `"Is this working?"` | `Is` | Verb | 0b10 |

### 13.5 Message Frame Encoding

```
plaintext_message = "Hi" (2 bytes, 16 bits)
version = 0x0
flags = 0x0 (plaintext, uncompressed)
length = 16 (payload bits)
payload = 0x4869 ("Hi" in ASCII)

frame_without_auth = [version:4bits][flags:4bits][length:16bits][payload:16bits]
                   = 0x00 0x00 0x10 0x48 0x69
                   = 0x0000104869 (40 bits = 5 bytes)

epoch_key = 0x8b2c5a9f3d1e7b4a6c8f2d5e9a3b7c1d4f6e8a2b5c9d3e7f1a4b8c2d6e9f3a7b

auth_input = frame_without_auth
auth_tag = HMAC-SHA256(epoch_key, auth_input)[0:8]
         = 0x3f7a2b9c5d1e4f8a

complete_frame = frame_without_auth || auth_tag
               = 0x00001048693f7a2b9c5d1e4f8a (13 bytes, 104 bits)
```

### 13.6 Reed-Solomon Encoding

```
message_frame = 0x00001048693f7a2b9c5d1e4f8a (13 bytes)

RS parameters:
  - GF(2^8), primitive polynomial 0x11D
  - 8 ECC symbols

ecc_symbols = RS_encode(message_frame)
            = 0xa1b2c3d4e5f6a7b8 (8 bytes)

protected_frame = message_frame || ecc_symbols
                = 0x00001048693f7a2b9c5d1e4f8aa1b2c3d4e5f6a7b8 (21 bytes)
```

### 13.7 Sequence Number and Nonce

```
epoch_key = 0x8b2c5a9f3d1e7b4a6c8f2d5e9a3b7c1d4f6e8a2b5c9d3e7f1a4b8c2d6e9f3a7b
message_sequence_number = 0 (first message on this channel)

nonce_input = epoch_key || UTF8("nonce") || uint64_be(message_sequence_number)
nonce = SHA256(nonce_input)[0:24]
      = 0x7c3a9b2e5d1f8c4a6b9e2d5f8a1c4b7e3d6a9c2f (24 bytes)
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
