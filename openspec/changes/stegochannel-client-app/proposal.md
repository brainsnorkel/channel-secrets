## Why

The StegoChannel protocol specification defines how to transmit covert messages through selection-based steganography, but there is no user-facing application that makes this accessible. Users currently would need to manually run CLI commands, calculate feature matches, track message state, and coordinate beacon epochs—a process too complex and error-prone for practical use. A client application would bridge the gap between the protocol specification and real-world secure communication.

## What Changes

- **New user application specification**: Define a complete client application that implements the StegoChannel protocol for end users
- **Receiving workflow**: Monitor followed accounts and feeds, automatically identify signal posts, decode messages, and present them in a readable interface
- **Sending workflow**: Help users compose posts that match required bit patterns, track transmission progress, manage draft buffers
- **Key management**: Secure storage and exchange of channel keys with communication partners
- **Multi-source channel support**: A channel can aggregate posts from N sender sources and M receiver sources across platforms (e.g., sender posts to both Bluesky + blog, receiver monitors both)
- **Platform focus**: Bluesky/ATProto and RSS/Atom feeds; app assists with composition for manual blog posting
- **Plausible deniability UX**: Design the app to appear as a normal social media client to casual observers

## Capabilities

### New Capabilities

- `client-architecture`: Overall application architecture, platform targets (web app initially), and security model
- `channel-management`: Creating, importing, exporting, and securely storing channel keys; managing multiple communication partners; configuring multi-source send/receive feeds per channel with redundancy support
- `message-receiving`: Monitoring sender feeds, signal post detection, feature extraction, message decoding, and notification system
- `message-sending`: Post composition assistance, feature matching, draft buffer management, transmission progress tracking
- `atproto-adapter`: Bluesky/ATProto integration—authentication, post fetching, publishing, AT URI handling for post IDs
- `rss-adapter`: RSS/Atom feed integration—reading feeds for receiving, composition assistance for manual blog posting, mapping feed item GUIDs to post IDs
- `beacon-sync`: Fetching and caching beacon values (Bitcoin, NIST, date); epoch boundary handling and timezone management
- `secure-storage`: Encrypted local storage for keys, message history, and application state
- `stealth-ux`: UI/UX patterns that maintain plausible deniability—app appears as a standard feed reader/social client

### Modified Capabilities

(none - this is the first implementation, no existing specs to modify)

## Impact

- **New codebase**: Reference implementation will be created (TypeScript web app, potentially with Tauri for desktop)
- **Protocol clarifications**: Implementation may reveal ambiguities in SPEC.md requiring clarification
- **Dependencies**:
  - **UI**: React with react-tosijs for path-based state management
  - **Validation**: tosijs-schema for runtime schema validation (~3kB, JSON-serializable)
  - **Platform**: ATProto SDK (@atproto/api), RSS parser
  - **Crypto**: Web Crypto API + libsodium-wrappers for XChaCha20-Poly1305
  - **Storage**: idb (IndexedDB wrapper) for encrypted local storage
- **Documentation**: SENDER_GUIDE.md and RECEIVER_GUIDE.md may evolve to reference the client app alongside CLI examples
- **Security surface**: New attack vectors to consider: browser security model, credential storage, UI spoofing
- **Platform scope**: Bluesky/ATProto for integrated send/receive; RSS/blogs for receive + assisted manual sending
