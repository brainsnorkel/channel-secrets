# StegoChannel Sender Guide

## Overview

This guide explains how to send covert messages using StegoChannel. You'll post normally on social media—the system selects *which* of your posts carry the hidden message based on their natural characteristics.

**You never need to change how you write.**

---

## Before You Start

You need:
- A shared channel key (exchanged securely with your recipient)
- The StegoChannel sender tool installed
- An active social media account (Bluesky, Mastodon, etc.)

---

## Quick Start

### Step 1: Import Your Channel Key

```bash
stegochannel key import "stegochannel:v0:K7gNU3sdo-OL0wNhgC2d76:btc:0.25:len,media,qmark"
```

Or create a new channel:
```bash
stegochannel key generate --beacon btc --rate 0.25
# Share the output with your recipient securely
```

### Step 2: Queue a Message

```bash
stegochannel send "Meet Tuesday 3pm usual place"
```

The tool will tell you approximately how many posts are needed.

### Step 3: Write Posts Normally

Compose posts as you normally would. Before publishing, check if the post is useful:

```bash
stegochannel check "Just finished a great book on cryptography!"
```

Output:
```
Post analysis:
  Selection: SIGNAL (this post carries message bits)
  Features:  len=1, media=0, qmark=0 → symbol 0b100
  Required:  0b100 ✓ MATCH
  
  Action: PUBLISH THIS POST
  Progress: 3/24 bits sent (12.5%)
```

Or:
```
Post analysis:
  Selection: SIGNAL
  Features:  len=1, media=0, qmark=0 → symbol 0b100
  Required:  0b011 ✗ NO MATCH
  
  Action: SKIP or SAVE FOR LATER
```

Or:
```
Post analysis:
  Selection: COVER (not a signal post)
  
  Action: PUBLISH FREELY (doesn't affect message)
```

### Step 4: Publish and Confirm

After publishing, confirm to advance the message state:

```bash
stegochannel confirm "at://handle/app.bsky.feed.post/3jxyz"
```

---

## Workflow Options

### Interactive Mode

For real-time checking as you compose:

```bash
stegochannel interactive
```

Paste draft posts and get instant feedback.

### Batch Mode

If you write posts in advance:

```bash
stegochannel batch posts.txt --message "secret message"
```

The tool selects which posts to publish and in what order.

### Draft Buffer

Save posts that don't match current requirements for later:

```bash
stegochannel draft save "Post that doesn't match now"
stegochannel draft list
stegochannel draft check  # See if any saved drafts now match
```

---

## How Long Does It Take?

Message transmission depends on your posting frequency:

| Your posts/day | Selection rate | Bits/day | "Meet at 3pm" (88 bits) |
|----------------|---------------|----------|-------------------------|
| 5 | 0.25 | ~4 | ~22 days |
| 10 | 0.25 | ~8 | ~11 days |
| 20 | 0.25 | ~15 | ~6 days |
| 10 | 0.50 | ~15 | ~6 days |

Short numeric codes are faster:
- "3" = ~16 bits → 2 days at 8 bits/day
- "42.7" = ~40 bits → 5 days

---

## Tips for Natural Operation

### Do

- Post at your normal frequency
- Continue posting after message completes (cover traffic)
- Vary your content as usual
- Post cover posts freely—they don't affect the message

### Don't

- Suddenly increase posting frequency
- Only post signal posts (publish cover posts too)
- Change your writing style
- Stop posting once message is sent

### Handling Mismatches

If many posts don't match, you have options:

1. **Wait**: Keep posting normally, matches will come
2. **Adjust naturally**: If you need `media=1`, share a link you'd share anyway
3. **Use draft buffer**: Save good posts for when they match

Never force unnatural posts just to match required bits.

---

## Security Notes

### What's Protected

- Message content (encrypted)
- The fact that you're communicating (selection is random without key)
- Post content (you write naturally)

### What You Must Protect

- Your channel key (never share except with recipient)
- Your device (don't run on compromised machines)
- Operational security (don't discuss the channel openly)

### Deniability

If questioned, your posts are genuine content. Without the key, no one can prove:
- Which posts are signal vs cover
- That any message exists
- What was communicated

---

## Troubleshooting

**"No signal posts matching"**

Normal. Keep posting naturally. The probability of matching is:
```
P(match) = selection_rate × (1 / 2^bits_per_post)
```
At 0.25 selection and 3 bits: ~3% of posts match a specific requirement.

**"Message taking too long"**

Options:
- Increase posting frequency naturally
- Use higher selection rate (coordinate with recipient)
- Use fewer features (less bits, faster transmission)
- Send shorter messages or numeric codes

**"Beacon sync error"**

Ensure your system clock is correct. Beacon values change at epoch boundaries:
- `btc`: Every ~10 minutes (block time)
- `nist`: Every minute
- `date`: Midnight UTC

---

## Command Reference

```
stegochannel key generate    Generate new channel
stegochannel key import      Import channel key
stegochannel key export      Export channel key
stegochannel send            Queue message for sending
stegochannel check           Check if a post matches
stegochannel confirm         Confirm post was published
stegochannel status          Show transmission progress
stegochannel draft           Manage draft buffer
stegochannel interactive     Interactive composition mode
stegochannel cancel          Cancel current message
```
