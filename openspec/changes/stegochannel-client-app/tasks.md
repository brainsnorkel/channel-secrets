## 0. Specification Clarifications (BLOCKING)

> These tasks must be completed before implementation begins. They address gaps identified in consensus review that could cause sender/receiver incompatibility or cryptographic failures.

- [ ] 0.1 Specify feature extraction normalization rules (Unicode NFC, grapheme counting, whitespace handling)
- [ ] 0.2 Define deduplication algorithm precisely (timing, hash inputs, ordering semantics)
- [ ] 0.3 Document message sequence number protocol (per-channel tracking, sync, recovery)
- [ ] 0.4 Complete test vector suite (feature extraction, framing, Reed-Solomon, HMAC)
- [ ] 0.5 Define epoch grace periods per beacon type (btc: 60s, nist: 30s, date: 300s)
- [ ] 0.6 Specify Reed-Solomon parameters (GF(2^8) primitive polynomial, library choice)
- [ ] 0.7 Document first-word category rules for edge cases (emoji, @mention, URL, non-English)
- [ ] 0.8 Spike: Verify libsodium WASM loading across target browsers
- [ ] 0.9 Document post ID stability guarantees (ATProto rkey persistence, RSS GUID handling)

## 1. Project Setup

- [ ] 1.1 Initialize TypeScript/React project with Vite
- [ ] 1.2 Configure build tooling (ESLint, Prettier, TypeScript strict mode)
- [ ] 1.3 Add core dependencies: @atproto/api, libsodium-wrappers, idb, react-tosijs, tosijs-schema
- [ ] 1.4 Set up project structure with adapter pattern (core/, adapters/, ui/, storage/)
- [ ] 1.5 Configure Tauri for optional desktop builds

## 2. Cryptographic Core

- [ ] 2.1 Implement HKDF-SHA256 key derivation using Web Crypto API
- [ ] 2.2 Implement SHA-256 hashing for post selection
- [ ] 2.3 Integrate libsodium for XChaCha20-Poly1305 encryption
- [ ] 2.4 Implement HMAC-SHA256 for message authentication (truncated to 64 bits)
- [ ] 2.5 Implement Argon2id passphrase-to-key derivation
- [ ] 2.6 Implement test vectors from complete suite (per 0.4)

## 3. Secure Storage

- [ ] 3.1 Design IndexedDB schema for encrypted storage
- [ ] 3.2 Implement passphrase setup and unlock flow
- [ ] 3.3 Implement AES-256-GCM encryption wrapper for stored data
- [ ] 3.4 Implement channel key storage and retrieval
- [ ] 3.5 Implement message history storage
- [ ] 3.6 Implement transmission state persistence
- [ ] 3.7 Implement credential storage for platform auth
- [ ] 3.8 Add data export/import functionality
- [ ] 3.9 Implement storage quota monitoring and pruning

## 4. Beacon Synchronization

- [ ] 4.1 Implement Bitcoin beacon fetcher (blockchain.info + blockstream fallback)
- [ ] 4.2 Implement NIST beacon fetcher with caching
- [ ] 4.3 Implement date beacon (UTC ISO 8601)
- [ ] 4.4 Implement epoch key derivation per SPEC.md Section 5
- [ ] 4.5 Implement epoch boundary detection and key rotation
- [ ] 4.6 Add clock drift detection and warning

## 5. Protocol Core

- [ ] 5.1 Implement post selection algorithm (selection_hash, threshold comparison)
- [ ] 5.2 Implement feature extraction (len, media, qmark, fword, wcount)
- [ ] 5.3 Implement message frame encoding (version, flags, length, payload, auth tag)
- [ ] 5.4 Implement message frame decoding with sliding window sync
- [ ] 5.5 Implement Reed-Solomon error correction (mandatory, 4 symbol tolerance per 0.6)
- [ ] 5.6 Implement bit accumulation with cross-source deduplication

## 6. ATProto Adapter

- [ ] 6.1 Implement Bluesky authentication with app password
- [ ] 6.2 Implement session token refresh
- [ ] 6.3 Implement DID resolution for handles
- [ ] 6.4 Implement post fetching (getAuthorFeed) with pagination
- [ ] 6.5 Implement post ID derivation from AT URI rkey
- [ ] 6.6 Implement post publishing (createRecord)
- [ ] 6.7 Implement media upload for posts with images
- [ ] 6.8 Add rate limiting and backoff handling
- [ ] 6.9 Implement feature extraction for Bluesky posts

## 7. RSS Adapter

- [ ] 7.1 Implement RSS 2.0 feed parser
- [ ] 7.2 Implement Atom feed parser
- [ ] 7.3 Implement post ID derivation from GUID or link hash
- [ ] 7.4 Implement feed polling with ETag/Last-Modified support
- [ ] 7.5 Add CORS proxy configuration for cross-origin feeds
- [ ] 7.6 Implement feed auto-discovery from website URLs
- [ ] 7.7 Implement feature extraction for RSS items
- [ ] 7.8 Implement manual publication confirmation flow

## 8. Channel Management

- [ ] 8.1 Implement channel key generation (256-bit random)
- [ ] 8.2 Implement stegochannel URI parser and serializer
- [ ] 8.3 Implement multi-source channel configuration (mySources, theirSources)
- [ ] 8.4 Implement channel CRUD operations
- [ ] 8.5 Implement channel naming and listing UI
- [ ] 8.6 Implement source redundancy tracking

## 9. Message Receiving

- [ ] 9.1 Implement feed polling scheduler (configurable intervals)
- [ ] 9.2 Implement signal post detection across all receiver sources
- [ ] 9.3 Implement chronological bit accumulation with deduplication
- [ ] 9.4 Implement frame synchronization and message extraction
- [ ] 9.5 Implement message authentication verification
- [ ] 9.6 Implement message decryption for encrypted payloads
- [ ] 9.7 Implement message storage and history display
- [ ] 9.8 Implement historical message recovery (date range scan)
- [ ] 9.9 Add notification system (generic text for stealth)

## 10. Message Sending

- [ ] 10.1 Implement message queuing and bit sequence calculation
- [ ] 10.2 Implement real-time post composition analyzer
- [ ] 10.3 Implement feature matching feedback UI
- [ ] 10.4 Implement feature requirement hints
- [ ] 10.5 Implement draft buffer management
- [ ] 10.6 Implement transmission progress tracking
- [ ] 10.7 Implement multi-source publication tracking
- [ ] 10.8 Implement publication confirmation (auto for Bluesky, manual for RSS)
- [ ] 10.9 Implement message cancellation with partial-send warning

## 11. Stealth UX

- [ ] 11.1 Design multi-column feed reader layout
- [ ] 11.2 Implement feed display with standard card/timeline UI
- [ ] 11.3 Implement hidden channel management in settings
- [ ] 11.4 Implement subtle message indicators (notes attached to posts)
- [ ] 11.5 Implement composition assistant disguised as posting tips
- [ ] 11.6 Implement quick-hide panic shortcut (Escape key)
- [ ] 11.7 Implement lock-on-blur option
- [ ] 11.8 Use generic IndexedDB database names
- [ ] 11.9 Implement generic notification text
- [ ] 11.10 Design progressive onboarding (feed reader first, channels as advanced)

## 12. Testing & Documentation

- [ ] 12.1 Add unit tests for cryptographic functions with test vectors
- [ ] 12.2 Add unit tests for protocol encoding/decoding
- [ ] 12.3 Add integration tests for ATProto adapter
- [ ] 12.4 Add integration tests for RSS adapter
- [ ] 12.5 Add end-to-end test for message send/receive cycle
- [ ] 12.6 Write user documentation for channel setup
- [ ] 12.7 Write user documentation for sending messages
- [ ] 12.8 Write user documentation for receiving messages
- [ ] 12.9 Document stealth features and best practices
