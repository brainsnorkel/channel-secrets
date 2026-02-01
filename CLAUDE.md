# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

StegoChannel is a **specification-only repository** defining a steganographic communication protocol. Messages are hidden not by modifying post content, but by selecting *which* naturally-written social media posts to publish based on a shared secret key.

There is no reference implementation yet—this repository contains only markdown documentation.

## Repository Structure

```
files/
├── README.md          # Project overview and quick start
├── SPEC.md            # Full protocol specification (canonical reference)
├── SECURITY.md        # Threat model and security analysis
├── SENDER_GUIDE.md    # How to transmit messages
├── RECEIVER_GUIDE.md  # How to receive messages
└── WORKED_EXAMPLE.md  # End-to-end example with actual values
```

## Key Protocol Concepts

- **Selection-based steganography**: The secret is in *which* posts are published, not their content
- **Epoch keys**: Derived from channel key + public beacon (Bitcoin block hash, NIST beacon, or date)
- **Signal vs cover posts**: ~25% of posts carry message bits; the rest are cover traffic
- **Feature extraction**: Post characteristics (length, media presence, punctuation) encode 3+ bits per signal post
- **Plausible deniability**: Without the key, signal posts are indistinguishable from cover posts

## Cryptographic Primitives

| Purpose | Algorithm |
|---------|-----------|
| Key derivation | HKDF-SHA256 (RFC 5869) |
| Post selection | SHA-256 hash comparison against threshold |
| Encryption (optional) | XChaCha20-Poly1305 |
| Authentication | HMAC-SHA256 (truncated to 64 bits) |
| Error correction | Reed-Solomon (4 symbol tolerance) |

## Development Tools

### OpenSpec (Spec-Driven Development)

This project uses OpenSpec for managing specification changes.

| Command | Purpose |
|---------|---------|
| `/opsx:new` | Start a new change proposal |
| `/opsx:continue` | Create the next artifact |
| `/opsx:apply` | Implement tasks |
| `openspec list` | List active changes |
| `openspec show <change>` | View change details |

### Beads (Issue Tracking)

Lightweight issue tracker with dependency support. Issue prefix: `channel-secrets-`

| Command | Purpose |
|---------|---------|
| `bd create "title"` | Create new issue |
| `bd list` | List open issues |
| `bd show <id>` | View issue details |
| `bd dep add <id> <dep>` | Add dependency |
| `bd close <id>` | Close issue |

## Contributing

This is an open specification under CC0 (public domain). Contributions welcome:
- Protocol improvements and security analysis in SPEC.md
- Clarifications to sender/receiver guides
- Additional worked examples
- Reference implementations (would go in separate directories)

When editing the specification, maintain consistency with the message frame format (Section 8) and key derivation (Section 5).
