# StegoChannel Quick Start Guide

Get up and running with hidden messages in 5 minutes.

---

## What is StegoChannel?

StegoChannel lets you send secret messages through your normal Bluesky posts. Your messages are hidden in **which posts you publish**, not in the posts themselves. To everyone else, you're just posting normally. Only someone with your shared passphrase can read your messages.

---

## Before You Start

You need:
- A modern web browser
- A Bluesky account
- An app password from Bluesky (not your main password)
- A passphrase to share with your contact (we'll help you create one)

---

## Step 1: Open the App

Open the StegoChannel app in your browser.

You'll see a login screen. Enter:
- Your Bluesky handle (e.g., `@yourname.bsky.social`)
- An **app password** (not your main password)

To create an app password:
1. Go to Bluesky Settings → App passwords
2. Click "Create app password"
3. Name it "StegoChannel"
4. Copy the password and paste it into the app

---

## Step 2: Create or Import a Channel

A **channel** is a secure connection with one contact.

### Option A: Create a New Channel (Recommended)

Click **"Create New Channel"**.

The app will:
1. Ask if you want to use a passphrase you create, or a random one
2. Generate a channel key (we'll show you how to share it)
3. Ask for your contact's name and Bluesky handle

**To share with your contact:** Send them the channel key through a **secure method**:
- In person
- Encrypted message (Signal, ProtonMail, etc.)
- Phone call (read it aloud, don't text)
- Never send it over Bluesky itself

### Option B: Import an Existing Channel

Click **"Import Existing Key"** and paste the channel key your contact gave you.

---

## Step 3: Send a Message

1. Click **"Send Message"** in the app
2. Type your message in the text box
3. Click **"Queue Message"**

The app tells you approximately how many posts you need to publish.

---

## Step 4: Compose Posts Normally

Now compose Bluesky posts as you normally would. Before publishing each post, the app analyzes it:

**If it shows "PUBLISH THIS POST":**
- The post carries message bits
- Click "Publish" in Bluesky
- Come back to the app and confirm once it's live
- Your message advances

**If it shows "SKIP or SAVE FOR LATER":**
- The post is a signal post, but doesn't have the right features
- Save the draft or rewrite it slightly
- The app gives you composition tips to help match the required features

**If it shows "PUBLISH FREELY":**
- This post is cover traffic (doesn't carry your message)
- Post it whenever you want—it doesn't affect your message
- Keep posting normally while you wait for more signal opportunities

---

## Step 5: Message Complete

Once you've published all the required posts, the app shows "Message sent successfully!"

---

## Receiving Messages

### Option A: Active Monitoring

In a contact's channel:
1. Click **"Monitor Posts"**
2. The app checks for new posts every 30 seconds
3. When a complete message is decoded, it appears in the app

### Option B: Check Manually

Click **"Check Now"** to check for new messages without continuous monitoring.

Messages appear in the **Message History** section once decoded.

---

## Troubleshooting

### "My message isn't advancing"

This is normal. Only about 25% of posts can be signal posts. The app shows exactly which posts can carry your message based on their features.

**What to do:**
- Keep posting naturally
- When the app shows "PUBLISH THIS POST", do it
- Your message will eventually complete

### "Message decoding failed" or "Invalid message"

This means the receiver's key doesn't match yours.

**How to fix:**
1. Double-check you both have the exact same channel key
2. Make sure the receiver is monitoring the correct sender
3. Try resetting the channel and re-importing the key

### "Bluesky login failed"

You're probably using your main password instead of an app password.

**How to fix:**
1. Go to Bluesky Settings → App passwords
2. Create a new app password (or use an existing one)
3. Use the app password, not your main Bluesky password

### "App password not working"

App passwords are 16 characters and look like: `xxxx-xxxx-xxxx-xxxx`

**If you're still stuck:**
- Go back to Bluesky settings and create a fresh app password
- Copy it carefully (no extra spaces)
- Paste it into the app

---

## Security Reminders

1. **Keep your passphrase secret** — If someone gets it, they can read your messages
2. **Use unique passphrases** — Don't use the same passphrase for multiple contacts
3. **Don't discuss the channel in posts** — Talking about StegoChannel in your Bluesky posts could attract attention
4. **Share the key securely** — Use a secure method (in person, encrypted message, etc.)
5. **Don't let your device get stolen** — If someone gets your device, they can access your messages

---

## Next Steps

- Read **USER_GUIDE.md** for detailed information on all features
- Check **SECURITY.md** to understand the threat model
- Visit **WORKED_EXAMPLE.md** for a complete example with real values

Have questions? The app's Help section has answers to common questions.
