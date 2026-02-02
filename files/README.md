# StegoChannel

**Covert messaging through natural social media activity**

StegoChannel enables hidden communication by encoding messages into the *selection* of social media posts, not their content. You write normally—the protocol determines which posts carry signal bits based on a shared secret key.

## How It Works

1. **Sender and receiver share a secret key** (out-of-band)
2. **Sender posts normally** to their social media account
3. **A deterministic function** (keyed by the shared secret and public randomness) identifies which posts are "signal posts"
4. **Signal posts' natural features** (length, presence of links, punctuation) encode message bits
5. **Receiver monitors public posts**, identifies signal posts with the same key, and extracts the message

Without the key, an observer cannot distinguish signal posts from noise—or even determine if communication is occurring.

## Properties

| Property | Status |
|----------|--------|
| Sender content modification | None required |
| Detection without key | Computationally infeasible |
| Plausible deniability | Yes |
| Platform dependencies | None (any public timestamped posts) |
| Forward secrecy | Optional (key ratcheting) |

## Quick Example

**Alice wants to send Bob a message.**

```bash
# Alice (sender)
$ stegochannel send "Tuesday 3pm"
Message queued. Estimated: ~15 posts over 3-5 days.

$ stegochannel check "Just finished reading a great article on climate policy"
SIGNAL post, symbol 0b101, MATCHES required bits.
Action: Publish this post.

$ stegochannel check "Anyone else excited for the weekend?"  
COVER post (not selected).
Action: Publish freely, doesn't affect message.
```

```bash
# Bob (receiver)
$ stegochannel receive --watch @alice.bsky.social
Monitoring...

[2025-02-01 16:42] MESSAGE RECEIVED
From: @alice.bsky.social
Auth: VALID
Content: "Tuesday 3pm"
```

## Documentation

- [**Interactive Demo**](../demo/index.html) — Try the protocol in your browser (no install required)
- [**Setup Guide**](SETUP_GUIDE.md) — Step-by-step guide to establish communication
- [Technical Paper](PAPER.md) — Semi-academic overview of the protocol
- [Protocol Specification](SPEC.md) — Full technical spec (implement from this)
- [Worked Example](WORKED_EXAMPLE.md) — End-to-end example with actual values
- [Sender Guide](SENDER_GUIDE.md) — How to transmit messages
- [Receiver Guide](RECEIVER_GUIDE.md) — How to receive messages
- [Security Model](SECURITY.md) — Threat model and limitations

## Capacity

Throughput depends on posting frequency and parameters:

| Posts/day | Selection rate | Bits/post | Capacity |
|-----------|---------------|-----------|----------|
| 5 | 25% | 3 | ~4 bits/day |
| 10 | 25% | 3 | ~8 bits/day |
| 20 | 50% | 5 | ~50 bits/day |

A short message like "yes" (~24 bits) takes 3-6 days at typical rates.

This is a **slow channel by design**—optimised for undetectability, not speed.

## Use Cases

- Journalist/source communication under surveillance
- Censorship-resistant coordination
- Dead drops without designated locations
- Deniable signalling between known parties

## Limitations

- **Low bandwidth**: Bits per day, not bits per second
- **Requires patience**: Messages take days to weeks
- **One-way per channel**: Sender→receiver (create reverse channel for replies)
- **Platform dependent availability**: Posts must remain accessible
- **No real-time**: Inherent latency in batch transmission

## Status

**Experimental** — This is a draft specification for research and development. Not audited. Use at your own risk for any serious application.

## Contributing

This is an open specification. Contributions welcome:

- Protocol improvements
- Reference implementations
- Security analysis
- Platform adapters

## Licence

- Specification: CC0 1.0 (public domain)
- Reference implementation: MIT

## Acknowledgements

Builds on concepts from:
- Linguistic steganography (Chapman, Davida, Rennhard)
- Coverless steganography
- Hash-based key derivation (Krawczyk)
- Public randomness beacons (NIST, Bitcoin)
