# StegoChannel

> **Hide messages in plain sight.** A steganographic communication protocol that encodes data by selecting *which* naturally-written social media posts to publish—not by modifying their content.

[![Status Badge](https://img.shields.io/badge/status-experimental-yellow)](https://github.com/your-org/channel-secrets)
[![Version](https://img.shields.io/badge/version-0.1.0--draft-blue)](https://github.com/your-org/channel-secrets)
[![License](https://img.shields.io/badge/license-CC0%201.0-green)](https://creativecommons.org/publicdomain/zero/1.0/)

---

## What Is StegoChannel?

StegoChannel is a novel steganographic protocol where the secret is **which posts you publish**, not what they say. You write naturally, and the system selects which posts carry hidden message bits based on their natural characteristics—length, media presence, punctuation patterns.

To observers without the shared secret key, signal posts are **indistinguishable from cover posts**. The protocol provides:

- **Undetectability**: Signal posts blend perfectly with normal posting patterns
- **Plausible deniability**: Without the key, it's impossible to prove communication occurred
- **Natural cover traffic**: No suspicious timing, unusual content, or embedded payloads
- **Optional encryption**: Encrypt messages for additional confidentiality

### How It Works

```
Sender                          Network                         Receiver
──────────────────────────────────────────────────────────────────────

1. Queue message
   "Meet 3pm Tuesday"
                │
                ├─ Compute signal posts
                │  (which natural posts
                │   carry bits)
                │
2. Write posts naturally
   "Great weather today"        ────────────────────────────>  Fetches all posts
   "Coffee is good"             ────────────────────────────>  from sender
   "Lunch at noon"  [SIGNAL]    ────────────────────────────>
   "Love this song"             ────────────────────────────>  Identifies signal posts
   "New shoes!"     [SIGNAL]    ────────────────────────────>  (using shared key)
                                                                │
                                                                ├─ Extract bits
                                                                ├─ Decode message
                                                                ├─ Decrypt (optional)
                                                                │
                                                                3. Recovers:
                                                                   "Meet 3pm Tuesday"
```

**Key Insight**: Both sender and receiver use the same secret key to independently determine which posts carry which bits. The beacon (Bitcoin block hash, NIST randomness, or date) provides shared randomness. Together they derive which posts are "signal posts."

---

## Key Features

| Feature | Benefit |
|---------|---------|
| **Selection-based** | No content modification—posts look 100% authentic |
| **Capacity**: 3 bits/post | Message a sentence in ~20 posts |
| **Platform agnostic** | Works with Bluesky, Mastodon, X, RSS feeds, etc. |
| **SHA-256 + HKDF** | Cryptographically sound post selection |
| **Error correction** | Reed-Solomon (corrects 4 symbol errors) |
| **Optional encryption** | XChaCha20-Poly1305 for message confidentiality |
| **Public beacons** | Bitcoin, NIST Randomness Beacon, or calendar date |
| **Deniability** | Sender can truthfully claim posts are authentic |

---

## Quick Start

### Try the Interactive Demo

Explore StegoChannel visually in your browser:

```bash
# Option 1: Open directly in your browser
open demo/index.html

# Option 2: Serve with any static file server
npx serve demo
# Visit http://localhost:3000
```

The demo shows:
- How beacon-derived keys work
- Signal post selection in real-time
- Bit extraction from natural post features
- End-to-end encoding and decoding

### Run the Reference Implementation

A TypeScript/React reference implementation is provided in `/app`:

```bash
cd app
npm install
npm run dev
```

Features:
- Sender: Queue messages and check posts
- Receiver: Fetch and decode messages
- Self-documenting UI with inline guidance
- Support for multiple beacon types

### Read the Full Specification

For cryptographic details, implementation requirements, and protocol edge cases:

```
docs/SPEC.md                 # Full technical specification
```

---

## Documentation

All specification documents are in the `docs/` directory:

| Document | Purpose | Audience |
|----------|---------|----------|
| **[SPEC.md](docs/SPEC.md)** | Complete protocol specification with cryptographic primitives, key derivation, feature extraction | Cryptographers, implementers |
| **[SETUP_GUIDE.md](docs/SETUP_GUIDE.md)** | Channel setup, key exchange, beacon selection | First-time users |
| **[SENDER_GUIDE.md](docs/SENDER_GUIDE.md)** | How to transmit messages step-by-step | Senders |
| **[RECEIVER_GUIDE.md](docs/RECEIVER_GUIDE.md)** | How to receive and decode messages | Receivers |
| **[WORKED_EXAMPLE.md](docs/WORKED_EXAMPLE.md)** | Complete end-to-end example with actual values | Everyone (validation) |
| **[SECURITY.md](docs/SECURITY.md)** | Threat model, what's protected, limitations | Security reviewers |

---

## How It Actually Works

### 1. Channel Setup

Sender and receiver establish a **shared channel key** using secure out-of-band communication (encrypted email, in-person handoff, etc.).

```
Channel Key: stegochannel:v0:K7gNU3sdo:btc:0.25:len,media,qmark
             └─ Version ┘         └──┬──┘  └──┬──┘ └──────┬──────┘
                                  Base64    Beacon    Features
```

### 2. Beacon-Derived Epoch Keys

Both parties independently derive the same **epoch key** using a public beacon:

```
Epoch Key = HKDF-Expand(
    key = channel_key,
    info = beacon_id + ":" + beacon_value + ":stegochannel-v0",
    length = 32
)
```

**Beacons** provide shared randomness without coordination:
- **`btc`**: Bitcoin block hash (~10 min epochs)
- **`nist`**: NIST Randomness Beacon (60 sec epochs)
- **`date`**: Calendar date (24 hr epochs)

### 3. Signal Post Selection

For each post, sender and receiver compute:

```
selection_hash = SHA256(epoch_key || post_id)
signal_score = first 8 bytes of selection_hash as uint64
is_signal = signal_score < (2^64 - 1) × selection_rate
```

With **selection_rate = 0.25**, ~25% of any posts are signal posts. This matches natural posting variation—an adversary cannot identify true signal posts from statistical analysis alone.

### 4. Bit Extraction

Signal posts encode 3 bits via natural features:

```
Bit 0: Post length
       • If length < median: 0
       • If length ≥ median: 1

Bit 1: Media presence
       • No images/video: 0
       • Has images/video: 1

Bit 2: Punctuation
       • No exclamation marks: 0
       • Has exclamation marks: 1
```

Example:
```
Post: "Just finished a great book on cryptography!"
Length: 45 chars (long)              → Bit 0 = 1
Media: None                           → Bit 1 = 0
Punctuation: Has "!"                  → Bit 2 = 1
Extracted: 101
```

### 5. Message Recovery

Receiver:
1. Fetches all sender's posts
2. Identifies signal posts (using same selection algorithm)
3. Extracts bits from signal post features
4. Decodes binary data (with Reed-Solomon error correction)
5. Optionally decrypts message (if encrypted)

---

## Cryptographic Primitives

| Function | Algorithm | RFC/Standard | Purpose |
|----------|-----------|--------------|---------|
| Hash | SHA-256 | FIPS 180-4 | Key derivation, post selection |
| KDF | HKDF-SHA256 | RFC 5869 | Deriving epoch keys from channel key |
| PRNG | ChaCha20 | RFC 7539 | Keystream for message encryption |
| Auth | HMAC-SHA256 (64-bit) | RFC 2104 | Message authentication |
| Encryption (optional) | XChaCha20-Poly1305 | RFC 8439 | Confidentiality + AEAD |
| Error correction | Reed-Solomon | ISO/IEC 18033 | Corrects up to 4 symbol errors |

---

## Security Guarantees

### What's Protected

- **Message confidentiality**: Optional XChaCha20-Poly1305 encryption
- **Communication existence**: Selection function is computationally indistinguishable from random without the key
- **Plausible deniability**: Sender's posts are genuinely authentic; no verifiable proof of communication
- **Message integrity**: HMAC authentication detects tampering

### What's Not Protected

- **Sender identity**: The platform knows who posted (but not that posts are signaling)
- **Beacon compromise**: If beacon source is compromised, epoch key derivation fails
- **Key compromise**: If channel key leaks, all past and future communication is exposed
- **Device compromise**: If sender/receiver device is hacked, messages can be extracted

**Full threat model and limitations**: See [SECURITY.md](docs/SECURITY.md)

---

## Reference Implementation

### Demo

An **interactive browser demo** in `demo/` shows:
- Beacon key derivation
- Live signal post selection
- Bit extraction visualization
- Complete encode/decode cycle

```bash
# Option 1: Open directly in your browser
open demo/index.html

# Option 2: Serve with any static file server
npx serve demo
# Visit http://localhost:3000
```

### Application

A **full reference implementation** in `app/` provides:
- Sender and receiver workflows
- Bluesky/ATProto integration (in progress)
- Secure key storage
- Beacon synchronization
- Self-documenting UI

The app is a working prototype—not production-ready yet, but demonstrates all protocol concepts.

---

## Contributing

This is an **open specification** under CC0 (public domain). All contributions welcome:

- **Protocol improvements**: Enhanced bit extraction, error correction, beacon methods
- **Security analysis**: Find vulnerabilities, suggest mitigations
- **Clarity**: Better documentation, clearer examples
- **Implementations**: Reference implementations in other languages
- **Platform adapters**: Integrations with new social networks

### Edit the Specification

1. Read [SPEC.md](docs/SPEC.md) to understand current design
2. Open an issue describing your proposal
3. Submit a PR with changes to relevant files in `docs/`
4. Ensure consistency with message frame format (Section 8 of SPEC.md) and key derivation (Section 5)

---

## Status

- **Version**: 0.1.0-draft
- **Status**: Experimental
- **License**: CC0 1.0 Universal (Public Domain)

This is a **specification-only repository**. The protocol is stable for feedback, but should be considered experimental. No production use without security review.

---

## What Makes StegoChannel Different

| Approach | Traditional Steganography | Stegoship | **StegoChannel** |
|----------|--------------------------|-----------|-----------------|
| **Encoding** | Modifies content (LSBs, timing, etc.) | Random cover posts | **Selects among natural posts** |
| **Detectability** | Steganalysis can find modifications | Adds artificial posts | **Posts are all authentic** |
| **Deniability** | "Someone else modified my files" | "I wrote random cover posts" | **"These are my normal posts"** |
| **Capacity** | High (bits per image) | Low (bits per message) | **Medium (3 bits/post)** |
| **Platform** | Files/images | Social media | **Social media (all platforms)** |

---

## Getting Help

- **Quick questions?** Read [SETUP_GUIDE.md](docs/SETUP_GUIDE.md)
- **How do I send?** See [SENDER_GUIDE.md](docs/SENDER_GUIDE.md)
- **How do I receive?** See [RECEIVER_GUIDE.md](docs/RECEIVER_GUIDE.md)
- **Show me an example** Check [WORKED_EXAMPLE.md](docs/WORKED_EXAMPLE.md)
- **Is it secure?** Review [SECURITY.md](docs/SECURITY.md)
- **Technical details?** Study [SPEC.md](docs/SPEC.md)

---

## License

This project is released under **CC0 1.0 Universal (Public Domain)**. You are free to use, modify, and distribute this specification for any purpose without attribution.

See [LICENSE](LICENSE) for full details.

---

**Built with cryptographic rigor. Designed for plausible deniability. Documented for clarity.**
