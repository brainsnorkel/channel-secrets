## Context

StegoChannel is a steganographic protocol that hides messages in the *selection* of social media posts rather than their content. The protocol specification exists but has no user-facing implementation. This design covers a client application supporting Bluesky/ATProto and RSS/Atom feeds, with multi-source channels allowing senders and receivers to use multiple platforms simultaneously for redundancy and increased bandwidth.

**Current state**: Protocol spec complete (SPEC.md), sender/receiver guides document CLI-style workflows, no reference implementation exists.

**Constraints**:
- Must maintain plausible deniability—app should appear as a normal social feed client
- Cryptographic operations must run client-side (no server-side key access)
- Must work with ATProto's decentralized architecture (PDSes, AppView)
- Low bandwidth protocol (~8 bits/day typical) means UX must handle multi-day message transmission gracefully

**Stakeholders**: Privacy-conscious users, journalists, activists, researchers

## Goals / Non-Goals

**Goals:**
- Provide a functional StegoChannel client that implements the full protocol spec
- Support Bluesky/ATProto for bidirectional communication (send + receive)
- Support RSS/Atom feeds for receive + assisted manual sending
- Support multi-source channels (N sender sources, M receiver sources) with redundancy
- Secure local storage for keys, message history, and state
- UX that appears as a standard social feed reader to casual observers
- Cross-platform web app (works in modern browsers, can be wrapped for desktop)

**Non-Goals:**
- Mobile native apps (out of scope for initial version; web app works on mobile browsers)
- Support for X/Twitter, Mastodon, or other platforms (future work)
- Anonymity network integration (Tor, I2P)—users can run through Tor Browser if needed
- Automated posting bots—human must compose and approve all posts
- Group messaging or multi-party channels (1:1 only for now)

## Decisions

### D1: Web Application with Optional Desktop Wrapper

**Decision**: Build as a TypeScript/React web application using tosijs ecosystem for state management and validation. Optionally wrap with Tauri for desktop distribution.

**Technology Stack**:
- **React** with TypeScript for UI components
- **react-tosijs** for path-based state management (lighter than Redux, ~10kB)
- **tosijs-schema** for runtime validation (~3kB, JSON-serializable schemas)
- **Vite** for build tooling
- **Tauri** (optional) for desktop distribution

**Rationale**:
- Web Crypto API provides necessary cryptographic primitives
- IndexedDB offers encrypted local storage capability
- Single codebase works across platforms
- tosijs provides simple path-based state without boilerplate (cleaner than Redux/Zustand)
- tosijs-schema schemas are JSON-serializable, useful for channel configuration validation
- Tauri (if needed) provides native filesystem access without Electron's overhead

**Alternatives considered**:
- React Native (rejected: adds complexity, mobile not priority)
- Electron (rejected: heavy, security concerns with Node integration)
- Native desktop only (rejected: limits accessibility)
- Pure tosijs without React (considered: tosijs can work standalone, but React ecosystem has more UI component libraries)

### D2: ATProto Integration via Official SDK

**Decision**: Use `@atproto/api` SDK for Bluesky integration.

**Rationale**:
- Official SDK handles authentication, session management, rate limiting
- Supports both Bluesky Social PDS and self-hosted PDSes
- AT URI format (`at://did/collection/rkey`) provides stable post identifiers

**Post ID derivation**: Use the `rkey` component of the AT URI as the post_id for selection hashing, as specified in SPEC.md Section 12.3.

### D3: Client-Side Cryptography Only

**Decision**: All cryptographic operations (key derivation, encryption, HMAC) happen in the browser. No keys ever leave the client.

**Rationale**:
- Essential for security model—users must control their keys
- Web Crypto API provides HKDF, SHA-256, and AES-GCM
- Use libsodium-wrappers (libsodium.js) for XChaCha20-Poly1305 (not in Web Crypto)

**Key storage**: Encrypt keys at rest using a user-provided passphrase via Argon2id → AES-256-GCM, stored in IndexedDB.

### D4: Beacon Fetching Strategy

**Decision**: Fetch beacons client-side with fallback chain.

| Beacon | Primary Source | Fallback |
|--------|---------------|----------|
| `btc` | blockchain.info API | blockstream.info API |
| `nist` | beacon.nist.gov | Cached last-known value |
| `date` | Local system clock (UTC) | — |

**Rationale**:
- No server dependency for beacon values
- Caching prevents service disruption if beacon source is temporarily unavailable
- Date beacon is most reliable for low-stakes use cases

### D5: Multi-Source Channel Architecture

**Decision**: A channel can have multiple sender sources and multiple receiver sources across platforms, providing redundancy and increased bandwidth.

**Channel configuration model**:
```
channel {
  key: "stegochannel:v0:...",
  beacon: "date",

  // Sources I post to (sender role)
  mySources: [
    { platform: "bluesky", handle: "@me.bsky.social" },
    { platform: "rss", feed: "https://myblog.com/feed.xml" }  // manual posting
  ],

  // Sources I monitor (receiver role)
  theirSources: [
    { platform: "bluesky", handle: "@them.bsky.social" },
    { platform: "rss", feed: "https://theirblog.com/feed.xml" }
  ]
}
```

**Rationale**:
- **Redundancy**: If a post is deleted on one platform, signal may still exist on another
- **Bandwidth**: More posting surfaces = more opportunities for matching signal posts
- **Flexibility**: Partners can use different platforms; receiver monitors all configured sources
- **Stealth**: Spreading posts across platforms makes pattern detection harder

**Deduplication**: When a sender posts the same content to multiple platforms, receiver deduplicates by content hash before accumulating bits.

**RSS sending workflow**: App provides composition assistant (feature matching, progress tracking). User manually posts to their blog, then confirms by providing the published post URL. App verifies via RSS feed fetch.

**Post ID derivation**:
- ATProto: `rkey` component of AT URI
- RSS: `<guid>` if present, otherwise SHA-256 of `<link>` URL

### D6: Stealth UX Pattern

**Decision**: App presents as "FeedDeck"—a multi-column feed reader. Secret messages appear inline as "notes" attached to posts, only visible when channel key is loaded.

**Rationale**:
- Plausible deniability: app looks like Tweetdeck/similar
- Users can show the app to others without revealing secret functionality
- Channel management hidden behind settings, not prominent in UI

**Cover story**: "It's a Bluesky client with RSS support"

### D7: Message Composition Workflow

**Decision**: Inline composition assistant that shows feature requirements and match status in real-time.

**Flow**:
1. User enters message to send → system calculates required bit sequence
2. User composes posts naturally in the editor
3. System shows: "This post is a SIGNAL post. Features: len=1, media=0, qmark=0 → 0b100. Required: 0b100 ✓ MATCH"
4. User publishes → system tracks progress
5. Non-matching signal posts can be saved to draft buffer for later

**Rationale**: Matches the workflow in SENDER_GUIDE.md but with real-time visual feedback.

### D8: Local-First State Management

**Decision**: All state stored locally in IndexedDB with tosijs path-based reactivity. No cloud sync.

**State Architecture**:
- **react-tosijs** provides path-based observers for UI reactivity (e.g., `'channels.active.messages'`)
- **tosijs-schema** validates channel configurations and message structures at runtime
- **IndexedDB** (via `idb` wrapper) persists encrypted state

**Stored data**:
- Channel configurations (encrypted, validated via tosijs-schema)
- Message transmission state (which bits sent, draft buffer)
- Received message history (encrypted)
- Sender calibration data (median post lengths, etc.)

**Rationale**:
- Privacy: no server-side data
- Works offline for composition; online only for fetch/publish
- Users can export/import encrypted backups
- Path-based state updates are more direct than action/reducer patterns
- tosijs-schema validation ensures channel URIs and configurations are well-formed before use

## Risks / Trade-offs

**[Risk] Beacon desynchronization** → Users in different timezones or with clock drift may compute different epoch keys.
*Mitigation*: Use NTP-synced UTC, warn if system clock appears off, prefer `date` beacon for less time-sensitive channels.

**[Risk] ATProto API changes** → Bluesky SDK is pre-1.0, APIs may change.
*Mitigation*: Abstract ATProto calls behind adapter interface, pin SDK version, monitor changelogs.

**[Risk] Feature extraction ambiguity** → Edge cases in post length, first-word categorization may differ between implementations.
*Mitigation*: Document precise algorithms, provide test vectors, consider fuzzy matching for robustness.

**[Risk] Browser storage limits** → IndexedDB quotas vary; large message histories could be purged.
*Mitigation*: Implement message archival/export, warn users about storage usage, auto-prune old data.

**[Risk] Suspicious app behavior** → Power users might notice unusual network patterns or storage.
*Mitigation*: Fetch feeds on normal schedule regardless of message state, avoid distinctive timing patterns.

**[Trade-off] Manual blog posting** → App cannot auto-publish to blogs; user must post manually and confirm.
*Accepted*: Blog APIs are too fragmented (WordPress, Ghost, Medium, etc.). Composition assistant provides all the guidance needed.

**[Trade-off] No mobile native app** → Users on mobile must use browser version.
*Accepted*: Web app works on mobile Safari/Chrome; native can come later as a Capacitor/Tauri Mobile wrapper.

## Open Questions

1. **Passphrase vs. WebAuthn**: Should key encryption use passphrase-based encryption or WebAuthn/FIDO2 for hardware key protection? (Leaning passphrase for portability)

2. **Notification strategy**: How to notify users of received messages without revealing the app's nature? (Consider generic "New activity" notifications)

3. **Multi-device sync**: If a user wants the same channels on multiple devices, how do they transfer? (Current plan: encrypted export/import file)

4. **Post deletion handling**: If a sender deletes a signal post, message is corrupted. Should we track deletion and warn? (ATProto provides deletion events via firehose)
