# StegoChannel Security Model

## Threat Model

### Adversary Capabilities

StegoChannel is designed to resist the following adversary:

| Capability | Assumed |
|------------|---------|
| Full access to all public posts | Yes |
| Statistical analysis of posting patterns | Yes |
| Knowledge of StegoChannel protocol | Yes |
| Machine learning steganalysis | Yes |
| Access to shared secret key | **No** |
| Compromise of sender/receiver devices | **No** |
| Coercion of sender/receiver | Partial (deniability) |

### Security Goals

1. **Confidentiality**: Message content unrecoverable without key
2. **Undetectability**: Cannot distinguish signal from cover posts without key
3. **Deniability**: Cannot prove communication occurred without key
4. **Integrity**: Tampered messages are detected

---

## What StegoChannel Protects

### Message Content

Messages are optionally encrypted with XChaCha20-Poly1305. Even if an adversary somehow identifies signal posts, content remains confidential.

### Communication Existence

This is the primary security goal. An adversary observing the sender's posts sees:
- Normal content (sender writes naturally)
- Normal timing (sender posts at their usual rate)
- No embedded payloads (nothing hidden in images, Unicode, etc.)

The selection function output is computationally indistinguishable from random without the key. Since ~25% of all posts are "signal posts", and this matches the natural false positive rate, an adversary cannot identify true signal posts.

### Plausible Deniability

If confronted, the sender can truthfully state:
- "These are my normal posts"
- "I didn't embed anything in them"
- "I don't know what you're referring to"

Without the key, an accuser cannot demonstrate:
- Which posts carry signal
- That any message exists
- What was communicated

---

## What StegoChannel Does NOT Protect

### Endpoint Security

If the adversary compromises the sender's or receiver's device, they can:
- Extract the channel key
- Read plaintext messages
- Monitor composition/reception

**Mitigation**: Use dedicated, hardened devices for sensitive operations.

### Metadata

StegoChannel does not hide:
- That the sender has a social media account
- The sender's posting activity
- That the receiver follows/monitors the sender

**Mitigation**: Use anonymous accounts, Tor for API access, or legitimate cover relationships.

### Coerced Key Disclosure

If the sender/receiver is compelled to reveal the key, deniability is lost.

**Mitigation**: 
- Use key ratcheting (old messages remain protected)
- Maintain parallel decoy channels with innocuous content
- Consider duress keys that reveal decoy messages

### Side Channels

Operational security failures can leak information:
- Discussing the channel on monitored platforms
- Correlated timing between message events and other behaviour
- Tool artifacts on devices

---

## Attack Analysis

### Steganalysis Without Key

**Attack**: Statistical analysis of post features to identify anomalies.

**Defence**: 
- Sender doesn't modify posts—features follow natural distribution
- Selection rate matches natural variance
- No detectable payload in any individual post

**Residual risk**: If sender unnaturally constrains posting to match required bits, statistical anomalies may emerge. Mitigated by encouraging natural cover traffic.

### Timing Analysis

**Attack**: Correlate posting patterns with suspected message events.

**Defence**:
- Messages span days/weeks, masking timing
- Sender maintains consistent posting independent of message state
- Cover posts continue after message completion

**Residual risk**: Dramatic changes in posting frequency may draw attention (but don't reveal content).

### Known Plaintext

**Attack**: If adversary knows/guesses message content, work backwards to identify signal posts.

**Defence**:
- Even with known plaintext, adversary must try all possible selection thresholds
- Epoch key changes with beacon, limiting window
- Multiple valid interpretations possible

**Residual risk**: Very short messages with predictable content may be vulnerable.

### Beacon Manipulation

**Attack**: Adversary controls public randomness source.

**Defence**:
- Bitcoin: Would require 51% attack
- NIST: Would require compromise of federal infrastructure
- Multiple beacon sources can be combined

**Residual risk**: Use of weak/predictable custom beacons.

### Post Modification/Deletion

**Attack**: Platform or adversary modifies/deletes posts to corrupt message.

**Defence**:
- Reed-Solomon error correction (default: 4 symbol tolerance)
- Auth tag detects tampering
- Receiver alerts on integrity failure

**Residual risk**: Massive deletion may prevent recovery. Consider archiving.

---

## Cryptographic Assumptions

Security relies on standard assumptions:

| Primitive | Assumption | Failure impact |
|-----------|------------|----------------|
| SHA-256 | Collision/preimage resistance | Selection predictability |
| HKDF | PRF security | Key derivation weakness |
| XChaCha20-Poly1305 | IND-CCA2 | Message confidentiality |
| ECDH (optional) | DDH hardness | Key establishment |

All primitives are well-studied with no known practical attacks.

---

## Operational Security Recommendations

### For High-Risk Users

1. **Dedicated device**: Use a separate device for StegoChannel operations
2. **Anonymous accounts**: Create sender account via Tor, no identity linkage
3. **Cover relationship**: Receiver should have legitimate reason to follow sender
4. **Consistent behaviour**: Maintain posting patterns regardless of message state
5. **Key hygiene**: Generate keys on air-gapped device, secure storage
6. **Decoy channels**: Maintain innocuous channels to explain tool presence

### Key Exchange

The weakest point is often initial key exchange. Options:

| Method | Security | Convenience |
|--------|----------|-------------|
| In-person | Highest | Lowest |
| Encrypted email/Signal | High | Medium |
| ECDH from public keys | High | High (if keys exist) |
| Shared secret derivation | Medium | High |

Never exchange keys over the same platform used for communication.

### Indicators of Compromise

Monitor for:
- Unexpected key negotiation requests
- Auth failures on received messages
- Requests to change parameters mid-message
- Unusual interest in your posting habits

---

## Comparison with Alternatives

| System | Hides content | Hides existence | No post modification | Platform agnostic |
|--------|--------------|-----------------|---------------------|-------------------|
| StegoChannel | Yes | Yes | Yes | Yes |
| Image steganography | Yes | Partially | No | Partially |
| Linguistic stego (synonym) | Yes | Partially | No | Yes |
| Encrypted DMs | Yes | No | N/A | No |
| Tor/onion services | Yes | Partially | N/A | N/A |

StegoChannel's unique property is that the sender's public output is completely natural—there's nothing to detect because nothing is hidden *in* the posts.

---

## Limitations Acknowledgement

StegoChannel is **not** appropriate for:

- Real-time communication
- Large data transfer
- Situations where endpoint security cannot be assured
- Users unable to maintain operational discipline

It **is** appropriate for:

- Low-bandwidth, high-security signalling
- Censorship circumvention
- Deniable coordination
- Dead drop equivalents

---

## Version

Security model version: 0.1.0-draft  
Last reviewed: 2025-02
