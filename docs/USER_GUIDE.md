# StegoChannel User Guide

Complete guide to using StegoChannel for secure, hidden communication.

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Managing Channels](#managing-channels)
4. [Sending Messages](#sending-messages)
5. [Receiving Messages](#receiving-messages)
6. [Security Best Practices](#security-best-practices)
7. [FAQ](#faq)

---

## Introduction

### What is Selection-Based Steganography?

Traditional steganography hides messages *inside* files (images, audio, etc.). StegoChannel hides messages in a different way: through the **selection of which posts to publish**.

Here's how it works:

1. You queue a message you want to send
2. You compose posts normally (just like you normally would on Bluesky)
3. Before posting, the app analyzes each post and tells you if it should be published
4. About 25% of your posts will be "signal posts" that carry your message bits
5. The receiver watches your posts and automatically extracts the hidden message

**You never modify your posts.** You just choose to publish some and skip others.

### Why This Approach?

**Plausible Deniability**: If someone examines your published posts, they look completely normal. Without the shared secret key, there's no way to tell which posts carry hidden messages—they're indistinguishable from regular posts.

**Natural Writing**: You don't have to change how you write. The system uses natural characteristics of your posts (length, media presence, punctuation) to encode information.

**No Embedded Payloads**: Unlike traditional steganography, there's nothing embedded in your posts. This makes it impossible to detect through image analysis, metadata inspection, or other technical means.

### How Messages Are Hidden

Each post has three features that encode information:

| Feature | What It Means | Example |
|---------|---------------|---------|
| **Length** | Is the post short or long? | "Hi!" = short, "Here's my thoughts on..." = long |
| **Media** | Does the post have an image? | With image or without image |
| **Question Mark** | Does the post end with a question? | "What do you think?" = yes, "That's interesting" = no |

These three features create a 3-bit code (8 possible combinations). Your message is broken down into 3-bit chunks, and the system selects which posts to publish based on whether they match each required code.

---

## Getting Started

### System Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection
- Bluesky account with app password

### Creating Your First Channel

1. Open the StegoChannel app
2. Log in with your Bluesky handle and app password
3. Click "Create New Channel"
4. Follow the wizard steps:
   - **Passphrase**: Create a strong passphrase or let the app generate one
   - **Contact Details**: Enter your contact's name and Bluesky handle
   - **Review**: Confirm everything looks correct
5. The app generates a channel key (looks like: `stegochannel:v0:K7gNU3sdo-OL0wNhgC2d76:date:0.25:len,media,qmark`)
6. Share the channel key with your contact through a secure method

### Importing an Existing Channel

If your contact already created the channel:

1. Open the StegoChannel app
2. Log in with your Bluesky handle and app password
3. Click "Create New Channel" then "Import Existing Key"
4. Paste the channel key your contact provided
5. Enter your contact's name and Bluesky handle
6. Click "Import"

---

## Managing Channels

### Viewing Your Channels

Click **"Channels"** to see all your channels. Each channel shows:

- **Contact name** — Who you're communicating with
- **Status** — Active, Paused, or Archived
- **Last activity** — When you last sent or received a message
- **Actions** — Send, Receive, or Settings

### Editing Channel Settings

Click a channel, then click **"Settings"**.

You can change:
- Contact name (for your reference only)
- Contact's Bluesky handle (if they changed it)
- Archive or delete the channel

### Understanding the Channel Key Format

A channel key looks like:
```
stegochannel:v0:K7gNU3sdo-OL0wNhgC2d76:date:0.25:len,media,qmark
```

Breaking it down:

| Part | Meaning | Example |
|------|---------|---------|
| `stegochannel:v0` | Protocol version | (always this) |
| `K7gNU3sdo-OL0wNhgC2d76` | The secret key | (unique per channel) |
| `date` | Beacon source | `date`, `btc`, or `nist` |
| `0.25` | Signal rate | 25% of posts are signal posts |
| `len,media,qmark` | Features used | How bits are encoded |

**What are beacons?**

Beacons are public sources of randomness that both sender and receiver use to stay in sync. They change on a schedule:

- **`date`** — Changes once per day (simplest, recommended for new users)
- **`btc`** — Changes with Bitcoin block hashes (~10 minutes)
- **`nist`** — Changes every minute (most secure, most posts needed)

### Deleting a Channel

Click a channel, then click **"Delete"**. This is permanent and cannot be undone.

---

## Sending Messages

### Queueing a Message

1. Open a channel
2. Click **"Send Message"**
3. Type your message in the text box
4. The app shows: "This message requires approximately X posts"
5. Click **"Queue Message"**

The message is now queued. You'll see a progress indicator showing how many posts you need to publish.

### Understanding Post Selection

As you compose posts, the app analyzes them:

```
Post Analysis:
  Selection: SIGNAL (this post carries message bits)
  Features:  len=1, media=0, qmark=0 → symbol 0b100
  Required:  0b101 ✗ NO MATCH

  Recommendation: SKIP or MODIFY
```

This means:
- The post is a **signal post** (one of the ~25% that can carry your message)
- Its features encode `0b100` (long post, no media, no question mark)
- But you need `0b101` (long post, with media, no question mark)
- Action: Either skip this post or add an image to match the required features

### Three Types of Posts

**1. SIGNAL POST WITH MATCHING BITS**

```
Selection: SIGNAL
Features:  0b101
Required:  0b101 ✓ MATCH

Action: PUBLISH THIS POST
```

This post has exactly the features you need. Publish it, then confirm in the app.

**2. SIGNAL POST WITHOUT MATCHING BITS**

```
Selection: SIGNAL
Features:  0b100
Required:  0b101 ✗ NO MATCH

Action: SKIP or MODIFY
```

You have two choices:

- **Skip**: Save the draft for later (maybe you'll need those bits after publishing other posts)
- **Modify**: The app suggests changes ("Add an image" or "Make it a question")

**3. COVER POST (NOT SELECTED)**

```
Selection: COVER

Action: PUBLISH FREELY
```

This post isn't a signal post. It doesn't affect your message at all. Publish it whenever you want—it's just normal cover traffic.

### Composition Tips

The app provides hints for matching required features:

| Feature | How to Change It | Tips |
|---------|-----------------|------|
| **Length** | Write more or less | "Hi!" is short, detailed thoughts are long |
| **Media** | Add or remove an image | Include a photo, screenshot, or meme |
| **Question** | End with a question or statement | "What do you think?" vs "I think..." |

**Example workflow:**

You need to encode `0b011`. The app tells you:
- You need: medium-length post + media + question mark
- Your draft: "Just finished a great book" (no media, no question)
- Suggestion: "Just finished a great book! Who else has read it? 📚"
- Now it has media tag (📚) and ends with a question ✓

### Tracking Progress

The progress bar shows:

```
Message Progress: 15 / 24 bits sent (62.5%)
Next required: 0b101
Posts published: 8
```

This means:
- You've sent 15 out of 24 bits
- You need to publish a post that encodes `0b101` next
- You've published 8 posts total (some were cover traffic)

### Canceling a Transmission

Click **"Cancel Transmission"** to stop sending the current message. The progress resets, but your posts remain published.

---

## Receiving Messages

### Monitoring a Contact

1. Open a channel (with a contact you want to receive from)
2. Click **"Monitor Posts"**
3. The app checks for new posts every 30 seconds

The app displays:

```
Monitoring @contact.bsky.social
Last check: 2 seconds ago
Posts analyzed: 142
Bits accumulated: 8/24
Current message: In progress...
```

### Understanding the Reception Process

As the app monitors posts:

**1. Post arrives from contact**
```
2025-02-01 14:32:02 | @contact: "Just finished lunch!"
```

**2. App checks if it's a signal post**
```
Selection: COVER (skipped)
```

**3. If signal post, features are extracted**
```
Selection: SIGNAL
Features: 0b101
Bits accumulated: 18/24
```

**4. When all bits are received and valid**
```
=== MESSAGE DECODED ===
From: @contact.bsky.social
Auth: VALID
Content: "Meet Tuesday 3pm usual place"
Received: 2025-02-01 15:47:33
```

### Epoch Synchronization

Both sender and receiver use a **beacon** (public randomness source) to stay synchronized. The beacon ensures they use the same selection key at the same time.

**What this means for you:**

- If there's a clock difference between you and your contact, messages might take slightly longer to decode
- The app automatically handles this—no action needed
- If synchronization seems off, check that both parties have the correct channel key

### Reading Decoded Messages

Decoded messages appear in **Message History** with:

- **From**: The sender's Bluesky handle
- **Content**: The decoded message
- **Timestamp**: When the message was complete
- **Auth**: Whether the message passed integrity check

### Monitoring Modes

**Continuous Watch** (Recommended)

Click "Monitor Posts" and leave it running. The app checks every 30 seconds.

**Manual Check**

Click "Check Now" to look for new messages without continuous monitoring.

**Background Mode**

On some browsers, the app can continue monitoring even if you navigate away (depends on browser settings).

---

## Security Best Practices

### Protecting Your Passphrase

- **Write it down** — Store on paper in a secure location (safe, lockbox)
- **Don't store digitally** — Don't keep it in Notes, Contacts, or cloud storage
- **Share securely** — Only send through encrypted channels (Signal, in person, etc.)
- **Memorize if possible** — For the most important channels
- **Use unique passphrases** — Don't reuse the same passphrase for multiple contacts

### Handling Channel Keys

- **Share once** — Send the key to your contact, then delete the message
- **Never email unencrypted** — Use Signal, ProtonMail, or in-person exchange
- **Never post the key** — Don't mention it on Bluesky or any public platform
- **Check digits** — If sharing verbally, verify the key matches digit-by-digit

### Device Security

- **Lock your device** — Use a strong password or biometric lock
- **Log out when done** — Don't leave the app open in a browser
- **Use a dedicated device** — If possible, use a separate device for sensitive channels
- **Keep software updated** — Update your browser and OS regularly
- **Consider a VPN** — Use one if your internet connection is untrustworthy

### Conversation Security

- **Don't mention StegoChannel in posts** — Avoid discussing the tool on Bluesky
- **Don't discuss channel topics in posts** — If you're organizing something secret, don't mention it publicly
- **Use plausible cover** — If monitoring a contact, make sure it looks natural (you follow them for legitimate reasons)

### What to Understand About Security

**StegoChannel provides plausible deniability** — Without your passphrase, someone examining your posts cannot prove you were sending hidden messages. Your posts look completely normal.

**But StegoChannel does NOT protect against:**
- Device compromise — If someone gets access to your device, they can access everything
- Key coercion — If forced to reveal your passphrase, security is lost
- Metadata — People can see that you post frequently and someone monitors you (though this looks normal)
- Bad passwords — A weak passphrase can be guessed

For complete understanding of what StegoChannel protects and doesn't, see **SECURITY.md**.

---

## FAQ

### How long does it take to send a message?

It depends on:
- **Message length** — Longer messages need more posts
- **Your posting frequency** — If you post 10 times a day, messages go faster
- **Signal rate** — 25% of posts are signal posts, so you need ~4 posts per bit
- **Beacon changes** — Every beacon change creates new selection requirements

**Rough estimate:** A 24-bit message (3 words) at 4 posts per signal post = 12 to 20 of your posts.

### What if my contact and I have different clock times?

The app handles this automatically through **epoch grace periods**. Even if you're 5 minutes apart, the receiver will still decode messages correctly. No action needed.

### Can someone intercept my messages?

No. Messages are only meaningful to someone with your passphrase. To everyone else, your posts look normal. There's nothing to intercept because there's no embedded payload.

### What if I accidentally publish a post that doesn't match?

No problem. The message tracking resets, and you'll need to publish the correct bits in future posts. Your previously published posts still contribute to your message—the system is resilient.

### Can I send to multiple people?

Yes. Create a separate channel for each person. Each channel has its own passphrase, so messages to different people are independent.

### What if I pause a transmission and come back later?

Your progress is saved. When you open the channel again, you'll see exactly where you left off and what bits still need to be sent.

### How secure is the passphrase?

The app uses **HKDF-SHA256** (a cryptographic key derivation function) to turn your passphrase into the actual channel key. A strong passphrase (4+ random words, or 8+ characters) is secure against guessing attacks.

### Can I use the same passphrase for multiple contacts?

No. Always use unique passphrases. If someone learns one passphrase, they can read all messages from that contact only, not others.

### What happens if I delete the app?

Your channels are stored in your browser. If you clear browser data or use a different device:
- You can re-import any channel using the channel key
- All message history is lost (unless you saved it)
- Your ability to send/receive is restored once you re-import

### How do I back up my channels?

1. Open each channel's settings
2. Copy the channel key
3. Store it somewhere secure (encrypted document, password manager, etc.)

To restore: Import the key using "Import Existing Channel".

### Can I use StegoChannel on mobile?

The app works in mobile browsers (iOS Safari, Android Chrome), but typing long messages is less convenient. Desktop recommended for composing.

### What if I forget my passphrase?

The passphrase cannot be recovered. If you forget it:
1. Delete the channel
2. Ask your contact for the channel key
3. Re-import it using "Import Existing Channel"
4. This does NOT expose your passphrase—you can use a different one to re-derive the same key

Actually, both of you must use the same passphrase, so if you forget it, you'll need your contact to share it with you again.

### Is this legal?

StegoChannel is a communication tool. Like any communication tool, how you use it is your responsibility. Consult local laws regarding encryption and communication in your jurisdiction.

### Can I export my messages?

Not directly from the app. You can:
- Screenshot conversations
- Copy/paste messages to a text file
- Use your browser's developer tools to access local storage

### Why do I need an app password, not my main Bluesky password?

**Security**: App passwords are limited to specific uses (in this case, StegoChannel). If an app is compromised, your main account stays protected. This is a best practice for any service.

To create an app password:
1. Go to Bluesky Settings
2. Click "App passwords"
3. Create a new one named "StegoChannel"
4. Use it in StegoChannel, not your main password

---

## Getting Help

- **In the app**: Click "Help" to see FAQs and explanations
- **On posts**: The app explains what each feature means when you hover over it
- **Error messages**: Each error has a "Learn more" link with detailed explanation

For technical questions about the protocol, see **SPEC.md**.

For security analysis, see **SECURITY.md**.

For a worked example with real values, see **WORKED_EXAMPLE.md**.
