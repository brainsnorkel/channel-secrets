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

## License

This reference implementation is open source. See LICENSE file for details.
