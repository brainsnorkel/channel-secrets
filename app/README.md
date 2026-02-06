# StegoChannel Reference Implementation

StegoChannel is a steganographic communication protocol that enables covert message transmission through public social media posts. The protocol works by selecting *which* naturally-written posts to publish based on a shared secret key, rather than modifying post content itself. This directory contains the React/TypeScript reference implementation.

**Full specification:** [../docs/SPEC.md](../docs/SPEC.md)

## Quick Start

```bash
npm install
npm run dev        # Start development server at http://localhost:5173/channel-secrets/
npm test           # Run unit tests (Vitest)
npm run e2e        # Run E2E tests (Playwright)
npm run build      # Production build to dist/
```

### Testing Mode

Append `?testing=1` to the URL to enable testing mode, which:
- Shows signal/cover post labels
- Displays expanded activity log
- Renders inline feature bits for diagnostics

## Architecture

The implementation uses a **5-layer architecture** with clean separation of concerns:

```
┌──────────────────────────────────────────┐
│                   UI                      │
│  React components, hooks, context         │
│  src/ui/                                  │
├──────────────────────────────────────────┤
│                  State                    │
│  Domain-isolated reactive state           │
│  src/state/                               │
├──────────────────────────────────────────┤
│                 Storage                   │
│  Encrypted IndexedDB (AES-256-GCM)       │
│  src/storage/                             │
├──────────────────────────────────────────┤
│                Adapters                   │
│  Bluesky (AT Protocol), RSS feeds        │
│  src/adapters/                            │
├──────────────────────────────────────────┤
│              Core Protocol                │
│  Beacon, Crypto, Framing, Selection,     │
│  Sender pipeline, Receiver pipeline      │
│  src/core/                                │
└──────────────────────────────────────────┘
```

### Layer 1: Core Protocol (`src/core/`)

Pure cryptographic and protocol implementation with zero platform dependencies.

**Implements:**
- **HKDF-SHA256 key derivation** (RFC 5869) - derives epoch keys from channel key and public beacon
- **SHA-256 post selection** - determines which posts carry message bits via hash comparison against threshold
- **XChaCha20-Poly1305 encryption** - optional message confidentiality
- **HMAC-SHA256 authentication** - message integrity (truncated to 64 bits)
- **Reed-Solomon error correction** - 4-symbol tolerance for reliability
- **Sender pipeline** - converts user message to signal posts via feature encoding
- **Receiver pipeline** - extracts signal posts and recovers original message

**Key modules:**
- `beacon.ts` - Fetches public randomness (Bitcoin, NIST, date-based)
- `crypto.ts` - Cryptographic primitives wrapper
- `selection.ts` - Hash-based post selection logic
- `features.ts` - Feature extraction from post text (length, media, punctuation)
- `sender.ts` - Message encoding to signal posts
- `receiver.ts` - Signal post recovery and message decoding

### Layer 2: Adapters (`src/adapters/`)

Platform abstraction layer enabling integration with social networks and feed sources.

**Implements:**
- `IPostAdapter` interface for publishing posts (Bluesky AT Protocol implementation)
- `IFeedAdapter` interface for retrieving posts (RSS/Atom feeds, Bluesky endpoints)
- `BlueskyAdapter` - Full Bluesky integration for publishing and fetching
- `RSSAdapter` - RSS/Atom feed parsing
- `MockAdapter` - In-memory testing implementation

**Design pattern:** Adapters are stateless functions that transform between protocol types and platform APIs. New platforms require only a new adapter implementation without touching core protocol logic.

### Layer 3: Storage (`src/storage/`)

Encrypted persistence using IndexedDB with AES-256-GCM encryption. All sensitive data is encrypted at rest.

**Stores:**
- **Channels** - Channel configurations, beacon sources, adapter settings
- **Messages** - Sent/received messages with timestamps and direction
- **Transmission state** - In-progress sender sessions (partial post lists, feature requirements)
- **Credentials** - Platform API keys, stored with Argon2id key derivation

**Key modules:**
- `storage.ts` - Main storage interface with encryption/decryption
- `crypto.ts` - Encryption primitives (AES-256-GCM, Argon2id)
- `schema.ts` - IndexedDB schema definitions
- `migrations.ts` - Versioning and schema upgrades

**Security:** All data is encrypted before storing in IndexedDB. Encryption keys are derived from a user passphrase via Argon2id. Memory is automatically zeroed when storage is locked.

### Layer 4: State (`src/state/`)

Domain-isolated reactive state management with 5 functional domains.

**Domains:**
- **Sender state** - Current message composition, target features, post requirements
- **Receiver state** - Beacon configuration, decoding status, recovered messages
- **Channel state** - Active channel, beacon selection, adapter configuration
- **Security state** - Lock status, passphrase verification, memory zeroing
- **UI state** - UI mode (compose, receive, settings), navigation, alerts

**Security features:**
- State guards prevent invalid transitions (e.g., sending without a channel)
- Automatic memory zeroing on lock
- Immutable updates via state machines
- Atomic transactions for multi-step operations

### Layer 5: UI (`src/ui/`)

React component tree with self-documenting guidance system.

**Features:**
- **Onboarding wizard** - Initial channel setup with beacon selection
- **Channel manager** - View/edit channels, manage credentials
- **Compose interface** - Real-time post preview with feature analysis showing how many bits the post encodes
- **Transmission progress** - Live status of post encoding and publication
- **Beacon health monitor** - Shows current beacon value and epoch status
- **Receiver dashboard** - Displays recovered messages with timestamps
- **Settings panel** - Passphrase management, credential storage, testing mode toggle

**Architecture:** Components are organized by feature domain rather than UI patterns. Each major feature (compose, receive, channel management) has its own directory with components, hooks, and context.

## Development

### Dev Server
```bash
npm run dev
```
Starts Vite dev server with HMR at `http://localhost:5173/channel-secrets/`

### Unit Tests
```bash
npm test
```
Runs Vitest with jsdom environment. Configuration in `vitest.config.ts`.

Test strategy:
- Core protocol functions have exhaustive unit tests
- Adapters have mock implementations for testing
- Storage tests use in-memory IndexedDB
- State machines have state transition tests

### E2E Tests
```bash
npm run e2e
```
Runs Playwright tests with Chromium. Configuration in `playwright.config.ts`.

E2E tests cover:
- Channel creation workflow
- End-to-end message transmission (compose → publish → receive)
- Beacon synchronization and epoch transitions
- Error handling and recovery

### Production Build
```bash
npm run build
```
Generates optimized production build to `dist/`. Uses Vite with TypeScript and React plugins.

## Documentation

- [Protocol Specification](../docs/SPEC.md) - Complete protocol details
- [Security Analysis](../docs/SECURITY.md) - Threat model and security proofs
- [Sender Guide](../docs/SENDER_GUIDE.md) - How to transmit messages
- [Receiver Guide](../docs/RECEIVER_GUIDE.md) - How to receive messages
- [Setup Guide](../docs/SETUP_GUIDE.md) - Initial channel configuration
- [Worked Example](../docs/WORKED_EXAMPLE.md) - End-to-end example with actual values

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `libsodium-wrappers-sumo` | Cryptographic primitives (HKDF, XChaCha20-Poly1305, Argon2id) |
| `@atproto/api` | Bluesky social network integration |
| `idb` | IndexedDB wrapper for encrypted storage |
| `reedsolomon` | Reed-Solomon error correction codes |
| `react` | UI framework |
| `react-dom` | React DOM rendering |
| `vite` | Build tool and dev server |
| `typescript` | Type safety |
| `vitest` | Unit testing framework |
| `playwright` | E2E testing framework |

## Development Workflow

1. **Feature development** - Make changes in `src/`
2. **Run tests** - `npm test` for unit tests, `npm run e2e` for integration tests
3. **Verify in dev server** - `npm run dev` and test manually at `http://localhost:5173/channel-secrets/`
4. **Build and verify** - `npm run build` produces production bundle
5. **Type check** - TypeScript configuration enforces strict type safety

## SPEC Cross-Reference

This table maps sections of the protocol specification to their implementations in the codebase.

| SPEC Section | Title | Implementation File(s) | Key Functions |
|---|---|---|---|
| 3 | Cryptographic Primitives | `src/core/crypto/index.ts` | `hkdfExpand`, `sha256`, `hmacSha256`, `xchachaPoly1305Encrypt`, `xchachaPoly1305Decrypt` |
| 4 | Public Beacon Sources | `src/core/beacon/index.ts` | `fetchBitcoinBeacon`, `fetchNistBeacon`, `fetchDateBeacon`, `getBeaconValue`, `deriveEpochKeyForBeacon` |
| 5 | Key Derivation | `src/core/crypto/index.ts` | `deriveEpochKey`, `deriveChannelKeyFromPassphrase`, `hkdfExpand` |
| 6 | Post Selection | `src/core/protocol/selection.ts` | `computeSelectionHash`, `getSelectionValue`, `computeThreshold`, `isSignalPost` |
| 7 | Feature Extraction | `src/core/protocol/features.ts` | `normalizeText`, `countGraphemes`, `extractLengthBit`, `extractMediaBit`, `extractQuestionBit`, `extractFirstWordBits`, `extractFeatures` |
| 8 | Message Encoding | `src/core/protocol/framing.ts`, `src/core/protocol/reed-solomon.ts` | `encodeFrame`, `decodeFrame`, `frameToBits`, `bitsToFrame`, `rsEncode`, `rsDecode` |
| 9 | Transmission Protocol | `src/core/sender/index.ts`, `src/core/receiver/index.ts` | Sender: `MessageTransmitter.queueMessage`, `checkPost`, `confirmPost`; Receiver: `FeedMonitor.fetchPosts`, `detectSignalPosts`, `extractBits`, `tryDecodeMessage` |
| 10 | Channel Establishment | `src/core/crypto/index.ts` | `validateChannelKeyFormat`, `deriveChannelKeyFromPassphrase`, `generateRandomPassphrase` |

## Public API

### Core Modules

#### `core/beacon` — Epoch Key Derivation and Beacon Fetching

- `getBeaconValue(beaconType)` — Fetch current beacon value with caching
- `deriveEpochKeyForBeacon(channelKey, beaconType)` — Derive epoch key from channel key and beacon
- `getBeaconHistory(beaconType)` — Get historical beacon values for grace period lookups
- `getEpochInfo(beaconType)` — Get epoch duration and grace period configuration
- `fetchBitcoinBeacon()` — Fetch latest Bitcoin block hash
- `fetchNistBeacon()` — Fetch NIST Randomness Beacon value
- `fetchDateBeacon()` — Get current UTC date as beacon value
- `getBeaconStatus(beaconType)` — Get beacon status (live/cached/failed) for UI display
- `clearBeaconCache()` — Clear beacon cache for testing

#### `core/crypto` — Cryptographic Primitives

**Key Derivation:**
- `deriveEpochKey(channelKey, beaconId, beaconValue)` — HKDF-Expand epoch key derivation (SPEC Section 5.1)
- `deriveChannelKeyFromPassphrase(passphrase, myHandle, theirHandle, options)` — Argon2id-based channel key derivation
- `generateRandomPassphrase(wordCount)` — Generate random passphrase from EFF wordlist
- `estimatePassphraseStrength(passphrase)` — Estimate passphrase strength with feedback
- `validateChannelKeyFormat(keyString)` — Validate channel key URI format

**Cryptographic Primitives:**
- `hkdfExpand(prk, info, length)` — HKDF-Expand using SHA-256 (RFC 5869)
- `sha256(data)` — SHA-256 hash
- `hmacSha256(key, message)` — HMAC-SHA256 truncated to 64 bits
- `xchachaPoly1305Encrypt(key, nonce, plaintext)` — XChaCha20-Poly1305 encryption
- `xchachaPoly1305Decrypt(key, nonce, ciphertext)` — XChaCha20-Poly1305 decryption
- `argon2id(password, salt, opsLimit, memLimit)` — Argon2id password hashing
- `constantTimeEqual(a, b)` — Constant-time byte array equality
- `constantTimeLessThan(a, b)` — Constant-time uint64 less-than comparison

**Byte Conversion:**
- `bytesToUint64BE(bytes)` — Convert big-endian bytes to uint64
- `uint64ToBytesBE(value)` — Convert uint64 to big-endian bytes
- `hexToBytes(hex)` — Convert hex string to bytes
- `bytesToHex(bytes)` — Convert bytes to hex string
- `stringToBytes(str)` — Convert string to UTF-8 bytes
- `concat(...buffers)` — Concatenate byte arrays

#### `core/protocol` — Protocol Frame Encoding/Decoding and Feature Extraction

**Post Selection (SPEC Section 6):**
- `computeSelectionHash(epochKey, postId)` — Compute SHA-256 selection hash
- `getSelectionValue(epochKey, postId)` — Get uint64 selection value for post
- `computeThreshold(selectionRate)` — Compute selection threshold from rate
- `isSignalPost(epochKey, postId, rate)` — Determine if post is signal post

**Feature Extraction (SPEC Section 7):**
- `normalizeText(text)` — Normalize text (NFC, whitespace, trim)
- `countGraphemes(text)` — Count Unicode grapheme clusters
- `extractLengthBit(text, threshold)` — Extract length feature (1 bit)
- `extractMediaBit(post)` — Extract media presence feature (1 bit)
- `extractQuestionBit(text)` — Extract question mark feature (1 bit)
- `extractFirstWordBits(text)` — Extract first word category (2 bits)
- `extractFeatures(post, featureSet, lengthThreshold)` — Extract all features from post

**Message Framing (SPEC Section 8):**
- `encodeFrame(message, options)` — Encode message into frame (version, flags, length, payload, auth tag)
- `decodeFrame(bytes, epochKey, seqNum)` — Decode and verify message frame
- `frameToBits(frame)` — Convert frame bytes to bit array
- `bitsToFrame(bits)` — Convert bit array to frame bytes

**Error Correction (SPEC Section 8.4):**
- `rsEncode(data)` — Reed-Solomon encode with 8 ECC symbols
- `rsDecode(data)` — Reed-Solomon decode with up to 4-symbol error correction

#### `core/sender` — Message Transmission Pipeline

- `MessageTransmitter` — Main class for sender pipeline (SPEC Section 9.1)
  - `registerChannel(config)` — Register a channel for transmission
  - `queueMessage(channelId, message, priority)` — Queue message for transmission
  - `checkPost(channelId, text, hasMedia)` — Preview what bits a draft post encodes
  - `confirmPost(channelId, postUri, text, hasMedia)` — Confirm published post and advance transmission
  - `getStatus(channelId)` — Get current transmission status and progress
  - `cancelTransmission(channelId)` — Cancel active transmission
  - `getPendingBits(channelId)` — Get next required bits for transmission
- `getNextRequiredBits(transmitter, channelId, maxBits)` — Get next N required bits

**UI Helper Functions:**
- `analyzePostFeatures(post, featureSet, lengthThreshold)` — Analyze post features with detailed breakdown
- `estimateSignalProbability(text, hasMedia, rate)` — Estimate likelihood post is signal
- `suggestModifications(text, targetBits, featureSet)` — Suggest text modifications to encode specific bits

#### `core/receiver` — Message Reception and Decoding

- `FeedMonitor` — Main class for receiver pipeline
  - `fetchPosts(sources)` — Fetch posts from configured sources (Bluesky, RSS)
  - `detectSignalPosts(posts, epochKey, rate)` — Filter signal posts from feed
  - `extractBits(signalPosts, featureSet, lengthThreshold)` — Extract bits from signal posts
  - `tryDecodeMessage(bits, epochKey, messageSeqNum)` — Attempt to decode message from bits
  - `processChannel(channel, messageSeqNum)` — Full receive pipeline for one channel
  - `startPolling(channelId, channel, onMessage)` — Start automatic polling
  - `stopPolling(channelId)` — Stop polling for channel
  - `stopAllPolling()` — Stop all polling
- `deriveEpochKeysForGracePeriod(channelKey, beaconType, timestamp)` — Derive epoch keys for grace period (SPEC Section 4.1)

### Adapter Modules

#### `adapters/atproto` — Bluesky/AT Protocol Integration

- `BlueskyAdapter` — Adapter for Bluesky social network
  - `login(identifier, password)` — Authenticate with Bluesky account
  - `getAuthorFeed(did, options)` — Fetch posts from author's feed
  - `createPost(text, options)` — Publish a post
  - `uploadImage(imageData, mimeType)` — Upload image for post attachment
  - `static extractPostId(uri)` — Extract post ID from AT URI
  - `resolveHandle(handle)` — Resolve handle to DID
- `Post` interface — Unified post structure
- `AuthorFeedResponse` interface — Feed response with pagination

#### `adapters/rss` — RSS/Atom Feed Parsing

- `RSSAdapter` — Adapter for RSS and Atom feeds
  - `fetchFeed(url)` — Fetch and parse RSS/Atom feed
- `FeedItem` interface — Unified feed item structure

### Storage Module

#### `storage` — Encrypted IndexedDB Persistence

- `StorageInterface` — Main storage API
  - `storeChannel(channel)` — Store encrypted channel configuration
  - `getChannel(channelId)` — Retrieve decrypted channel
  - `storeMessage(message)` — Store encrypted message
  - `getMessages(channelId)` — Retrieve messages for channel
  - `storeTransmissionState(state)` — Store transmission state
  - `getTransmissionState(channelId)` — Retrieve transmission state
  - `storeCredential(id, credential)` — Store encrypted credential
  - `getCredential(id)` — Retrieve credential
  - `lock()` — Lock storage (zero sensitive memory)
  - `unlock(passphrase)` — Unlock storage with passphrase
  - `delete(key)` — Delete encrypted data
  - `clear()` — Clear all data
- `Channel` interface — Channel configuration
- `Message` interface — Stored message
- `TransmissionState` interface — Sender state

### State Module

#### `state` — Reactive State Management

Domain-isolated state stores using Zustand with state guards and memory zeroing.

- `useSenderState()` — Sender state (message composition, post requirements)
- `useReceiverState()` — Receiver state (beacon config, decoded messages)
- `useChannelState()` — Channel state (active channel, beacon selection)
- `useSecurityState()` — Security state (lock status, memory zeroing)
- `useUIState()` — UI state (mode, navigation, alerts)

## Test Architecture

### Unit Tests (Vitest)

**Command:** `npm run test:run`

- **Framework:** Vitest with jsdom environment
- **Configuration:** `vitest.config.ts`
- **Coverage:** 794+ unit test cases
- **Strategy:**
  - Core protocol functions: exhaustive tests with SPEC test vectors
  - Adapters: mock implementations for testing
  - Storage: in-memory IndexedDB with fake-indexeddb
  - State machines: state transition validation

**Key Test Files:**
- `src/core/crypto/*.test.ts` — Cryptographic primitives (HKDF, HMAC, XChaCha20-Poly1305, Argon2id)
- `src/core/beacon/*.test.ts` — Beacon fetching and caching
- `src/core/protocol/*.test.ts` — Feature extraction, post selection, frame encoding (SPEC test vectors Section 13)
- `src/core/sender/*.test.ts` — Message transmission pipeline
- `src/core/receiver/*.test.ts` — Message reception and decoding
- `src/storage/*.test.ts` — Encrypted storage operations
- `src/adapters/*.test.ts` — Adapter implementations

**Test Isolation:**
- Unit tests use `fake-indexeddb` for storage
- Crypto tests use Web Crypto API and libsodium
- No external API calls (mocked via adapters)

### E2E Tests (Playwright)

**Command:** `npm run e2e`
**UI Mode:** `npm run e2e:ui`

- **Framework:** Playwright with Chromium
- **Configuration:** `playwright.config.ts`
- **Test Directory:** `src/e2e`
- **Reporter:** HTML report to `test-results/e2e`

**Coverage:**
- Channel creation workflow
- End-to-end message transmission (compose → publish → receive)
- Beacon synchronization and epoch transitions
- Error handling and recovery

**Test Isolation:**
- Fresh `browser.newContext()` per test
- No cross-test data sharing
- Independent test data setup

### Testing Mode

**Enable via URL:** Append `?testing=1` to development URL
**Default:** Testing mode enabled in dev/test environments

**Features in Testing Mode:**
- Signal/cover post labels visible on UI
- Expanded activity log with detailed events
- Inline feature bit display for diagnostics
- `TestingModeContext` provider in React tree
- Test utilities available in browser console

### Test Utilities

**Location:** `src/test/setup.ts`

- `initSodium()` — Initialize libsodium for crypto tests
- `createMockChannel()` — Create test channel configuration
- `createMockPost()` — Create test post data
- Mock adapters for Bluesky and RSS feeds

### Running Tests

```bash
# Run all unit tests once
npm run test:run

# Run unit tests with UI
npm test

# Run E2E tests
npm run e2e

# Run E2E with UI mode (interactive)
npm run e2e:ui

# Update E2E screenshots
npm run e2e:update

# Type check entire project
npm run typecheck

# Format and lint
npm run lint
npm run format
```

### CI/CD Integration

Tests run automatically on pull requests via GitHub Actions:
- Unit tests: Quick feedback loop (< 30 seconds)
- Type checking: Strict TypeScript compilation
- E2E tests: Full integration validation (< 5 minutes)
- Build validation: Production bundle generation

## License

This reference implementation is open source. See LICENSE file for details.
