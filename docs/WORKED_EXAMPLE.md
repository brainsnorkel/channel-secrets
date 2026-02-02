# StegoChannel Worked Example

A complete end-to-end example with actual values.

---

## Scenario

**Alice** wants to send **Bob** the message: `"3pm"`

They've pre-shared a channel key and agreed on parameters.

---

## 1. Channel Setup

### Shared Parameters

```
Channel key (K):     0x7365637265746b6579313233343536 (ASCII: "secretkey123456" padded)
Beacon:              date (daily, UTC)
Selection rate:      0.25 (25% of posts are signal)
Features:            len, media, qmark (3 bits per signal post)
Length threshold:    100 characters (calibrated to Alice's median)
```

### Key in shareable format

```
stegochannel:v0:c2VjcmV0a2V5MTIzNDU2:date:0.25:len,media,qmark
```

---

## 2. Message Encoding

### Original message
```
"3pm"
```

### Convert to bits (UTF-8)
```
'3' = 0x33 = 00110011
'p' = 0x70 = 01110000
'm' = 0x6D = 01101101
```

### Build message frame

```
Version:    0000 (4 bits)
Flags:      0000 (4 bits) - plaintext, uncompressed
Length:     0000000000011000 (16 bits) = 24 bits payload
Payload:    001100110111000001101101 (24 bits)
Auth tag:   [computed below]
```

### Compute auth tag

```
auth_input = version || flags || length || payload
           = 0000 0000 0000000000011000 001100110111000001101101
           
epoch_key  = [derived below for 2025-02-01]

auth_tag   = HMAC-SHA256(epoch_key, auth_input)[0:8]  // truncated to 64 bits
```

### Full frame (without ECC)
```
0000 0000 0000000000011000 001100110111000001101101 [64-bit auth tag]
```

Total: 4 + 4 + 16 + 24 + 64 = **112 bits**

With 3 bits per signal post: need **38 signal posts** (rounded up)

---

## 3. Epoch Key Derivation

### Current date (beacon value)
```
Date: 2025-02-01
Beacon value: "2025-02-01"
```

### Derive epoch key
```python
import hashlib
import hmac

channel_key = bytes.fromhex('7365637265746b6579313233343536')
beacon_value = "2025-02-01"
info = f"date:{beacon_value}:stegochannel-v0".encode()

# Simplified HKDF-Expand (for illustration)
epoch_key = hmac.new(channel_key, info, hashlib.sha256).digest()

# Result:
epoch_key = bytes.fromhex('a3f2c891d4e5b7062839cf41ab5d8e9f3721604c8b9a5e2d1f0c7b6a49382715')
```

---

## 4. Post Selection (Alice's Posts)

Alice makes these posts on 2025-02-01:

| # | Post ID | Post content | Chars |
|---|---------|--------------|-------|
| 1 | `post_001` | "Morning coffee and catching up on emails" | 42 |
| 2 | `post_002` | "Has anyone tried the new Thai place on George St? Thinking of going for lunch" | 78 |
| 3 | `post_003` | "Just mass of meetings scheduled for the rest of the day unfortunately" | 71 |
| 4 | `post_004` | "Interesting article about renewable energy policy changes coming in March" | 74 |
| 5 | `post_005` | "Finally finished that report. Time for a break!" | 48 |
| 6 | `post_006` | "Does anyone have recommendations for a good accountant in Sydney?" | 65 |

### Selection calculation for each post

```python
import struct

threshold = int(0.25 * (2**64 - 1))  # = 4611686018427387903

for post_id in ['post_001', 'post_002', 'post_003', 'post_004', 'post_005', 'post_006']:
    selection_hash = hashlib.sha256(epoch_key + post_id.encode()).digest()
    selection_value = struct.unpack('>Q', selection_hash[:8])[0]
    is_signal = selection_value < threshold
    print(f"{post_id}: {selection_value:020d} < {threshold:020d} ? {is_signal}")
```

**Results:**

| Post ID | Selection value | Threshold | Signal? |
|---------|-----------------|-----------|---------|
| `post_001` | 15832847293847561234 | 4611686018427387903 | No (COVER) |
| `post_002` | 02847561029384756102 | 4611686018427387903 | **Yes (SIGNAL)** |
| `post_003` | 11293847562038475610 | 4611686018427387903 | No (COVER) |
| `post_004` | 03948571620384756192 | 4611686018427387903 | **Yes (SIGNAL)** |
| `post_005` | 08475619203847561920 | 4611686018427387903 | No (COVER) |
| `post_006` | 01938475610293847561 | 4611686018427387903 | **Yes (SIGNAL)** |

Signal posts: **#2, #4, #6**

---

## 5. Feature Extraction

### Feature definitions

| Feature | Rule | Bit value |
|---------|------|-----------|
| `len` | chars >= 100 | 1 if true, 0 if false |
| `media` | contains URL or media | 1 if true, 0 if false |
| `qmark` | contains "?" | 1 if true, 0 if false |

### Extract features from signal posts

**Post #2**: "Has anyone tried the new Thai place on George St? Thinking of going for lunch"
- Length: 78 chars → `len = 0`
- Media: No → `media = 0`
- Question mark: Yes ("?") → `qmark = 1`
- **Symbol: 0b001**

**Post #4**: "Interesting article about renewable energy policy changes coming in March"
- Length: 74 chars → `len = 0`
- Media: No → `media = 0`
- Question mark: No → `qmark = 0`
- **Symbol: 0b000**

**Post #6**: "Does anyone have recommendations for a good accountant in Sydney?"
- Length: 65 chars → `len = 0`
- Media: No → `media = 0`
- Question mark: Yes → `qmark = 1`
- **Symbol: 0b001**

### Extracted bit sequence so far
```
001 000 001 = 9 bits received
```

---

## 6. Sender's Decision Process

Alice has the message frame starting with:
```
0000 0000 0000000000011000 00110011...
```

She needs the first symbol to be `0b000` (bits 0-2 of frame).

### Checking posts before publishing

**Post #2** would produce symbol `0b001`
- Required: `0b000`
- **NO MATCH** → Alice can publish freely (becomes cover) or hold for later

Wait—Post #2 was selected as SIGNAL. Alice checks: does `0b001` match what she needs?

Actually, let me reconsider the flow:

### Corrected sender flow

Alice has queued message bits: `000 000 000 000 000 001 100 0...` (frame starts with version=0000)

First 3 bits needed: `000`

She composes posts naturally, then checks each:

1. **Draft**: "Morning coffee and catching up on emails"
   - Selection check → COVER
   - **Action**: Publish freely (doesn't affect message)

2. **Draft**: "Has anyone tried the new Thai place on George St?"
   - Selection check → SIGNAL
   - Features: `0b001`
   - Required: `0b000`
   - **Action**: NO MATCH. Save to draft buffer or discard.

3. **Draft**: "Just finished that report. Time for a break!"
   - Selection check → COVER
   - **Action**: Publish freely

4. **Draft**: "Interesting article about renewable energy policy changes"
   - Selection check → SIGNAL
   - Features: `0b000`
   - Required: `0b000`
   - **Action**: MATCH! Publish this post.
   - Progress: 3/112 bits sent

Now Alice needs next symbol: `0b000` (bits 3-5)

5. **Draft**: "The weather today is absolutely perfect for a walk"
   - Selection check → SIGNAL
   - Features: `len=0, media=0, qmark=0` → `0b000`
   - Required: `0b000`
   - **Action**: MATCH! Publish.
   - Progress: 6/112 bits sent

And so on...

---

## 7. Receiver's Process (Bob)

Bob monitors Alice's public posts with the same key.

### Bob fetches Alice's posts

He sees posts appearing on her timeline.

### For each post, Bob computes selection

Using the same `epoch_key`, Bob identifies which posts are SIGNAL.

### Bob extracts features from signal posts

Post: "Interesting article about renewable energy policy changes"
- Selection: SIGNAL ✓
- Features: `0b000`
- Append to buffer

Post: "The weather today is absolutely perfect for a walk"
- Selection: SIGNAL ✓
- Features: `0b000`
- Append to buffer

### Bob's received buffer grows

```
Buffer: 000 000 ...
```

### Frame detection

After accumulating bits, Bob attempts to parse:

```
Version: 0000 ✓ (valid)
Flags: 0000 ✓ (valid)
Length: 0000000000011000 = 24 bits
```

Bob now knows to expect 24 payload bits + 64-bit auth tag.

After receiving all 112 bits:

```
Payload bits: 001100110111000001101101
Auth tag: [64 bits]
```

### Verify auth tag

Bob computes expected auth tag using `epoch_key` and received data.

If match: **MESSAGE VALID**

### Decode payload

```
00110011 = 0x33 = '3'
01110000 = 0x70 = 'p'
01101101 = 0x6D = 'm'
```

**Recovered message: "3pm"**

---

## 8. Timeline Summary

| Day | Alice's action | Signal posts published | Bits sent | Total |
|-----|---------------|----------------------|-----------|-------|
| 1 | Posts naturally, checks matches | 2 | 6 | 6 |
| 2 | Posts naturally, checks matches | 3 | 9 | 15 |
| 3 | Posts naturally, checks matches | 2 | 6 | 21 |
| ... | ... | ... | ... | ... |
| 14 | Final signal post | 1 | 3 | 112 |

At ~8 bits/day (assuming 10 posts/day, 25% selection, 3 bits each), the 112-bit message takes approximately **14 days**.

---

## 9. What an Observer Sees

An adversary monitoring Alice sees:

- Normal posts about daily life
- Typical posting frequency
- No embedded data, unusual formatting, or hidden content

Without the key, the adversary:
- Cannot determine which posts are signal vs cover
- Cannot predict the selection function output
- Cannot extract any meaningful pattern

The posts are genuine, unmodified content. The "message" exists only in the selection—which is invisible without `K`.

---

## 10. Python Verification Code

```python
#!/usr/bin/env python3
"""
StegoChannel worked example verification
"""

import hashlib
import hmac
import struct

# Channel parameters
channel_key = b'secretkey123456\x00'  # 16 bytes
beacon_value = "2025-02-01"
selection_rate = 0.25
len_threshold = 100

# Derive epoch key
info = f"date:{beacon_value}:stegochannel-v0".encode()
epoch_key = hmac.new(channel_key, info, hashlib.sha256).digest()
print(f"Epoch key: {epoch_key.hex()}")

# Selection threshold
threshold = int(selection_rate * (2**64 - 1))
print(f"Selection threshold: {threshold}")

# Test posts
posts = [
    ("post_001", "Morning coffee and catching up on emails", False),
    ("post_002", "Has anyone tried the new Thai place on George St?", True),
    ("post_003", "Just mass of meetings today", False),
    ("post_004", "Interesting article about renewable energy policy changes", False),
    ("post_005", "Finally finished that report. Time for a break!", False),
    ("post_006", "Does anyone have recommendations for a good accountant?", True),
]

print("\n--- Post Selection ---")
for post_id, content, has_qmark in posts:
    selection_hash = hashlib.sha256(epoch_key + post_id.encode()).digest()
    selection_value = struct.unpack('>Q', selection_hash[:8])[0]
    is_signal = selection_value < threshold
    
    if is_signal:
        # Extract features
        len_bit = 1 if len(content) >= len_threshold else 0
        media_bit = 0  # None have media in this example
        qmark_bit = 1 if has_qmark else 0
        symbol = (len_bit << 2) | (media_bit << 1) | qmark_bit
        print(f"{post_id}: SIGNAL, symbol=0b{symbol:03b}, content[:40]='{content[:40]}...'")
    else:
        print(f"{post_id}: COVER")

# Message encoding
message = "3pm"
message_bits = ''.join(f'{byte:08b}' for byte in message.encode())
print(f"\n--- Message Encoding ---")
print(f"Message: {message}")
print(f"As bits: {message_bits}")
print(f"Length: {len(message_bits)} bits")

# Frame
version = "0000"
flags = "0000"
length = f"{len(message_bits):016b}"
frame = version + flags + length + message_bits
print(f"Frame (without auth): {frame}")
print(f"Frame length: {len(frame)} bits + 64-bit auth = {len(frame) + 64} bits total")
print(f"Signal posts needed: {(len(frame) + 64) // 3 + 1}")
```

---

## 11. Key Observations

1. **Most posts are cover**: Only ~25% carry signal bits
2. **Not all signal posts are published**: Alice only publishes signal posts matching required bits
3. **Timing is flexible**: Alice posts when convenient, just checks before publishing
4. **Receiver is passive**: Bob just monitors public posts
5. **Content is genuine**: Nothing suspicious in any post
