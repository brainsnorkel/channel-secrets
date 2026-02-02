# StegoChannel Setup Guide

A practical guide to establishing covert communication using StegoChannel.

---

## What You'll Need

| Item | Sender | Receiver |
|------|--------|----------|
| StegoChannel client software | Yes | Yes |
| Social media account (public) | Yes | No |
| Shared secret key | Yes | Yes |
| Secure channel for key exchange | Yes | Yes |

---

## Step 1: Install the Client

### Interactive Demo (No Install)

Try StegoChannel immediately in your browser:

**[Open Interactive Demo](../demo/index.html)**

The demo lets you:
- Generate channel keys
- Test post selection
- See feature extraction in action
- Encode/decode sample messages

### Command-Line Tool

```bash
# Via npm
npm install -g stegochannel

# Verify installation
stegochannel --version
```

---

## Step 2: Generate a Channel Key

One party generates the key and shares it with the other.

### Using the Demo

1. Open the [Interactive Demo](../demo/index.html)
2. Click **"Generate New Key"**
3. Note the key string (starts with `stegochannel:v0:`)

### Using the CLI

```bash
stegochannel key generate --beacon date --rate 0.25

# Output:
# Channel key generated:
# stegochannel:v0:K7gNU3sdo-OL0wNhgC2d76:date:0.25:len,media,qmark
#
# Share this key SECURELY with your recipient.
```

### Key Parameters Explained

| Parameter | Meaning | Recommendation |
|-----------|---------|----------------|
| `beacon` | Randomness source | `date` for simplicity, `btc` for stronger security |
| `rate` | Fraction of posts that carry signal | `0.25` (balanced) |
| `features` | How bits are extracted | `len,media,qmark` (3 bits/post) |

---

## Step 3: Exchange the Key Securely

**This is the most critical step.** If the key is intercepted, security is lost.

### Recommended Methods

| Method | Security Level | How |
|--------|---------------|-----|
| In-person | Highest | Meet physically, exchange on paper or air-gapped device |
| Signal/encrypted chat | High | Send via disappearing messages |
| Encrypted email (PGP) | High | Encrypt to recipient's public key |
| Phone call (reading aloud) | Medium | Say the key; don't text it |

### Never Do This

- Don't send the key over the same platform you'll use for posts
- Don't email it unencrypted
- Don't store it in cloud notes
- Don't share it with anyone except your communication partner

---

## Step 4: Configure the Receiver

The person receiving messages sets up monitoring.

### Import the Key

```bash
stegochannel key import "stegochannel:v0:K7gNU3sdo-OL0wNhgC2d76:date:0.25:len,media,qmark"
```

### Add the Sender to Watch List

```bash
# For Bluesky
stegochannel watch add @sender.bsky.social

# For Mastodon
stegochannel watch add @sender@mastodon.social --platform mastodon
```

### Start Monitoring

```bash
# Continuous monitoring
stegochannel receive --watch

# Or run as background service
stegochannel daemon start
```

---

## Step 5: Send a Message (Sender)

### Queue Your Message

```bash
stegochannel send "Tuesday 3pm"

# Output:
# Message queued.
# Frame size: 88 bits
# Estimated posts needed: ~30 signal posts
# At 10 posts/day, 25% selection: ~12 days
```

### Post Normally, Check Before Publishing

Write posts as you normally would. Before publishing each one:

```bash
stegochannel check "Just finished a great book on history!"
```

**If SIGNAL + MATCH:**
```
Post analysis:
  Selection: SIGNAL
  Symbol: 0b010
  Required: 0b010 ✓ MATCH

  Action: PUBLISH THIS POST
  Progress: 6/88 bits (7%)
```

**If SIGNAL + NO MATCH:**
```
Post analysis:
  Selection: SIGNAL
  Symbol: 0b010
  Required: 0b101 ✗ NO MATCH

  Action: Skip or save for later
```

**If COVER:**
```
Post analysis:
  Selection: COVER

  Action: PUBLISH FREELY (doesn't affect message)
```

### Confirm After Publishing

```bash
stegochannel confirm
# Progress updated: 6/88 bits sent
```

---

## Step 6: Receive the Message

The receiver's monitoring tool works automatically:

```
[14:32:01] Checking @sender.bsky.social
[14:32:02] Post abc123: SIGNAL → 0b010
[14:32:02] Buffer: 6 bits accumulated

... (over several days) ...

[16:47:33] === MESSAGE RECEIVED ===
From: @sender.bsky.social
Auth: VALID ✓
Content: "Tuesday 3pm"
===========================
```

---

## Timing Expectations

StegoChannel is slow by design—optimised for undetectability, not speed.

| Message | Bits | At 8 bits/day | At 15 bits/day |
|---------|------|---------------|----------------|
| "yes" | ~32 | 4 days | 2 days |
| "3pm" | ~40 | 5 days | 3 days |
| "Tuesday noon" | ~96 | 12 days | 6 days |
| Short sentence | ~200 | 25 days | 13 days |

**Factors affecting speed:**
- Your posting frequency
- Selection rate (higher = faster but more detectable)
- Bits per post (more features = faster)

---

## Operational Security Tips

### For the Sender

1. **Post normally** — Don't change your writing style or frequency
2. **Publish cover posts** — Don't only post signal matches
3. **Continue after completion** — Keep posting to provide cover
4. **Don't force matches** — Wait for natural matches rather than writing artificial posts

### For the Receiver

1. **Passive monitoring** — Never interact with signal posts (no likes, replies)
2. **Use a VPN/Tor** — Hide your API access if needed
3. **Vary polling** — Don't check at exactly regular intervals
4. **Protect logs** — Encrypt or auto-delete received messages

### For Both

1. **Protect the key** — Treat it like a password to your most sensitive account
2. **Agree on backup** — Have a plan if the channel is suspected compromised
3. **Test first** — Send a test message before relying on the channel

---

## Troubleshooting

### "No posts matching"

This is normal. At 25% selection rate and 3 bits/post, only ~3% of posts will match any given requirement. Keep posting naturally.

### "Beacon sync error"

Ensure your system clock is correct:
```bash
# Check current beacon
stegochannel beacon status

# Force UTC
stegochannel config set beacon.timezone UTC
```

### "Auth tag invalid"

The message was corrupted or tampered with. Do not trust the content. Request retransmission via a secure backup channel.

### Messages taking too long

Options:
- Increase posting frequency naturally
- Use shorter messages or codes
- Switch to higher selection rate (coordinate with partner first)

---

## Quick Reference Card

### Sender Commands
```bash
stegochannel key generate          # Create new channel
stegochannel key import "..."      # Import shared key
stegochannel send "message"        # Queue message
stegochannel check "post text"     # Check if post matches
stegochannel confirm               # Confirm post published
stegochannel status                # View progress
```

### Receiver Commands
```bash
stegochannel key import "..."      # Import shared key
stegochannel watch add @user       # Add sender
stegochannel receive --watch       # Start monitoring
stegochannel daemon start          # Background mode
stegochannel history               # View messages
```

---

## Next Steps

- **[Worked Example](WORKED_EXAMPLE.md)** — See a complete transmission with actual values
- **[Sender Guide](SENDER_GUIDE.md)** — Detailed sender instructions
- **[Receiver Guide](RECEIVER_GUIDE.md)** — Detailed receiver instructions
- **[Security Model](SECURITY.md)** — Understand the threat model
- **[Protocol Specification](SPEC.md)** — Full technical details

---

## Summary

1. **Generate key** → One party creates, shares securely
2. **Receiver configures** → Import key, add sender, start watching
3. **Sender posts normally** → Check each post, publish matches
4. **Message arrives** → Receiver's tool decodes automatically
5. **Continue cover traffic** → Both parties maintain normal behaviour

The beauty of StegoChannel is that your posts are genuine—nothing is hidden *in* them. The secret is in *which* posts you choose to publish.
