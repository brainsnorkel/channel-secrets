# StegoChannel Receiver Guide

## Overview

This guide explains how to receive covert messages via StegoChannel. You'll monitor a sender's public posts—the system automatically identifies signal posts and extracts the hidden message.

**No interaction with the sender is required during reception.**

---

## Before You Start

You need:
- A shared channel key (exchanged securely with your sender)
- The StegoChannel receiver tool installed
- The sender's social media handle

---

## Quick Start

### Step 1: Import Your Channel Key

```bash
stegochannel key import "stegochannel:v0:K7gNU3sdo-OL0wNhgC2d76:btc:0.25:len,media,qmark"
```

### Step 2: Add Sender to Watch List

```bash
stegochannel watch add @sender.bsky.social --platform bluesky
```

### Step 3: Start Monitoring

```bash
stegochannel receive --watch
```

The tool will:
1. Fetch the sender's posts
2. Identify signal posts using the shared key
3. Extract features and accumulate bits
4. Alert you when a valid message is decoded

---

## Monitoring Modes

### Continuous Watch

```bash
stegochannel receive --watch
```

Polls for new posts at regular intervals. Runs until stopped.

### Manual Check

```bash
stegochannel receive --check
```

Single pass through recent posts, then exits.

### Background Daemon

```bash
stegochannel daemon start
stegochannel daemon status
stegochannel daemon stop
```

Runs in background, logs to `~/.stegochannel/messages.log`.

---

## Understanding the Output

### During Reception

```
[2025-02-01 14:32:01] Checking @sender.bsky.social
[2025-02-01 14:32:02] Post 3jxyz123: COVER (ignored)
[2025-02-01 14:32:02] Post 3jabc456: SIGNAL → 0b101
[2025-02-01 14:32:02] Buffer: 18 bits accumulated
[2025-02-01 14:32:02] Frame sync: not yet valid
```

### Message Received

```
[2025-02-01 15:47:33] === MESSAGE RECEIVED ===
[2025-02-01 15:47:33] From: @sender.bsky.social
[2025-02-01 15:47:33] Auth: VALID
[2025-02-01 15:47:33] Content: "Meet Tuesday 3pm usual place"
[2025-02-01 15:47:33] ========================
```

### Notifications

Configure alerts:

```bash
stegochannel config set notify.desktop true
stegochannel config set notify.sound true
stegochannel config set notify.command "notify-send 'StegoChannel' '%message%'"
```

---

## Multi-Sender Setup

Monitor multiple senders with different keys:

```bash
stegochannel channel create alice --key "stegochannel:v0:abc..."
stegochannel channel create bob --key "stegochannel:v0:xyz..."

stegochannel watch add @alice.bsky.social --channel alice
stegochannel watch add @bob@mastodon.social --channel bob --platform mastodon

stegochannel receive --watch --all-channels
```

---

## Historical Message Recovery

If you weren't monitoring when a message was sent:

```bash
stegochannel receive --since 2025-01-15 --until 2025-01-20
```

Or scan all available history:

```bash
stegochannel receive --full-history
```

Note: Requires posts to still be accessible on the platform.

---

## Verification and Trust

### Message Authentication

Every message includes an auth tag. The tool verifies automatically:

```
Auth: VALID     # Authentic, unmodified
Auth: INVALID   # Corrupted or tampered—do not trust
Auth: PARTIAL   # Message incomplete, still receiving
```

### Sender Verification

The channel key binds you to a specific sender. If the correct sender publishes to their account, only they can produce valid messages.

However, StegoChannel cannot verify:
- That the sender controls their account voluntarily
- That the sender's device isn't compromised
- The sender's real-world identity

Use out-of-band verification for critical communications.

---

## Handling Reception Issues

### "No signal posts found"

Possible causes:
- Sender hasn't started transmitting
- Epoch mismatch (check your system clock)
- Wrong channel key
- Sender using different parameters

Check:
```bash
stegochannel debug --sender @sender.bsky.social --last 10
```

### "Frame sync failed"

The tool found signal posts but couldn't form a valid message. Causes:
- Message still in progress
- Corrupted posts (edited/deleted)
- Key mismatch

Wait for more posts, or verify key with sender.

### "Auth tag invalid"

Message extracted but authentication failed:
- Possible transmission error
- Possible tampering
- Key desync

Do not trust the content. Request retransmission through secure channel.

### Beacon Synchronisation

Both parties must use the same beacon value. If you're in different timezones:

```bash
stegochannel config set beacon.timezone UTC
```

For `btc` beacon, ensure you're querying the same blockchain view:
```bash
stegochannel config set beacon.btc.source "blockchain.info"
```

---

## Security Notes

### Passive Reception

Receiving is entirely passive:
- No requests to the sender
- No interaction with their posts
- Only public API reads

### Privacy of Reception

Your monitoring activity could be observed:
- API requests to fetch posts
- Network traffic patterns

For sensitive operations:
- Use Tor or VPN
- Vary polling intervals
- Monitor through a separate account/device

### What to Protect

- Your channel key
- Your device
- Message logs (`~/.stegochannel/messages.log`)

```bash
stegochannel config set storage.encrypt true
stegochannel config set storage.retention 7d  # Auto-delete after 7 days
```

---

## Command Reference

```
stegochannel key import         Import channel key
stegochannel watch add          Add sender to watch list
stegochannel watch remove       Remove sender
stegochannel watch list         List monitored senders
stegochannel receive            Receive messages
stegochannel channel            Manage multiple channels
stegochannel daemon             Background service control
stegochannel debug              Troubleshoot reception
stegochannel config             Configuration settings
stegochannel history            View received messages
stegochannel export             Export message archive
```

---

## Example Session

```bash
$ stegochannel key import "stegochannel:v0:K7gNU3sdo:btc:0.25:len,media,qmark"
Channel key imported successfully.
Beacon: btc (Bitcoin block hash)
Selection rate: 25%
Features: len, media, qmark (3 bits/post)

$ stegochannel watch add @alice.bsky.social
Added @alice.bsky.social to watch list.

$ stegochannel receive --watch
Monitoring 1 sender(s). Press Ctrl+C to stop.

[14:01:12] Epoch: btc block #881442
[14:01:13] @alice.bsky.social: 3 new posts
[14:01:13] Post at://...abc: COVER
[14:01:13] Post at://...def: SIGNAL → 0b011
[14:01:13] Post at://...ghi: COVER
[14:01:13] Buffer: 3 bits

[14:15:08] @alice.bsky.social: 2 new posts
[14:15:08] Post at://...jkl: SIGNAL → 0b110
[14:15:08] Post at://...mno: SIGNAL → 0b001
[14:15:08] Buffer: 9 bits

... (time passes) ...

[16:47:33] === MESSAGE RECEIVED ===
From: @alice.bsky.social
Sent: 2025-02-01 (across 24 posts)
Auth: VALID ✓

"Meet Tuesday 3pm usual place"

===========================
^C
Monitoring stopped.
```
