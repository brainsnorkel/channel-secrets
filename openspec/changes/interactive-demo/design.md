## Context

The StegoChannel protocol specification defines a selection-based steganography system where covert messages are transmitted by choosing which posts to publish. The cryptographic decisions—hash comparisons against thresholds, bit extraction from post features, message frame assembly—are intentionally invisible to observers.

This invisibility, while essential for security, makes the protocol difficult to understand, demonstrate, and debug. Currently there is no way to "see" the protocol in action without instrumenting a full implementation.

**Constraints:**
- Must work offline with zero external dependencies
- Must be a single HTML file (no build step, no server)
- Must be educational without compromising protocol accuracy
- Must support both step-through exploration and continuous demo modes

## Goals / Non-Goals

**Goals:**
- Visualize sender and receiver perspectives simultaneously
- Expose cryptographic decisions (hash, threshold, signal/cover classification)
- Show bit extraction from post features in real-time
- Demonstrate message frame assembly progressively
- Provide reproducible demos with deterministic seeds
- Work as a standalone HTML file in any modern browser

**Non-Goals:**
- Production-ready UI/UX polish (this is a technical demo)
- Mobile-first design (desktop focus)
- Accessibility compliance (educational prototype)
- Real social media integration (that's the client app's job)
- Encryption/decryption of message payload (focus on steganography layer)

## Decisions

### 1. Single HTML File Architecture

**Decision:** Bundle everything (HTML, CSS, JS) into one self-contained file.

**Rationale:**
- Zero deployment friction—just open the file
- Works offline, no CORS issues
- Easy to share and embed
- Aligns with "no external services" requirement

**Alternatives considered:**
- Vite/bundler setup: Better DX but adds build step complexity
- Separate files: Cleaner code but requires a server for module loading

### 2. In-Memory Shared State

**Decision:** Use a single JavaScript object as the "social network database" that both sender and receiver views read from.

```
AppState = {
  posts: [...],           // Timeline of all posts
  epoch: { ... },         // Current beacon/epoch state
  sender: { ... },        // Sender-specific state
  receiver: { ... },      // Receiver-specific state
  channelKey: Uint8Array  // Shared secret
}
```

**Rationale:**
- Simplest mental model
- No synchronization complexity
- Both views update reactively when state changes

**Alternatives considered:**
- BroadcastChannel API: Enables multi-tab demo but adds complexity
- LocalStorage: Persistence unnecessary for demo

### 3. Step/Auto Mode Toggle

**Decision:** Support two execution modes controlled by a toggle:
- **Step mode:** User manually advances each protocol decision
- **Auto mode:** Continuous execution with configurable speed

**Rationale:**
- Step mode is essential for education—see each decision
- Auto mode shows the protocol "in action" for demos
- Same underlying logic, different timing control

### 4. Feature Extraction Visualization

**Decision:** Show feature extraction as a visual breakdown:

```
┌─────────────────────────────────────────┐
│ "Great coffee today! ☕"                │
├─────────────────────────────────────────┤
│ Length: 23 chars                        │
│   ≥50? NO  → bit 0                      │
│ Has media: NO → bit 0                   │
│ Ends with emoji: YES → bit 1            │
│ ─────────────────────────               │
│ Extracted pattern: 001                  │
│ Needed pattern:    101                  │
│ Match? NO → COVER POST                  │
└─────────────────────────────────────────┘
```

**Rationale:**
- Makes the "magic" transparent
- Shows why a post is signal vs cover
- Educational for understanding feature encoding

### 5. Mock Beacon with Three Modes

**Decision:** Provide three beacon simulation modes:
1. **Fixed seed:** Deterministic sequence from a seed value (for reproducible demos)
2. **Accelerated:** Real time but epochs are minutes instead of days
3. **Manual:** User clicks "Next Epoch" button

**Rationale:**
- Fixed seed enables scripted walkthroughs
- Accelerated shows epoch transitions naturally
- Manual gives full control for exploration

### 6. Inspector as Overlay

**Decision:** Inspector panel is a toggleable overlay/sidebar, not always visible.

**Rationale:**
- Demonstrates "what observers see" vs "what keyholders see"
- Toggle reinforces the steganography concept
- Cleaner default view

### 7. Web Crypto API Only

**Decision:** Use only browser-native Web Crypto API for all cryptographic operations.

**Rationale:**
- Zero dependencies
- Consistent with "no external services"
- HKDF, SHA-256, HMAC all available natively

**Trade-off:** No XChaCha20-Poly1305 (would need libsodium). Demo focuses on steganography layer, not message encryption.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Single file becomes unwieldy (>2000 lines) | Use IIFE modules, clear section comments, consider inlined source maps |
| Web Crypto API inconsistencies across browsers | Target modern browsers only (Chrome, Firefox, Safari latest) |
| Demo diverges from spec | Use same constants/algorithms as SPEC.md, add spec reference comments |
| UI becomes cluttered with all the debug info | Inspector is off by default; progressive disclosure |
| Step mode is tedious for long messages | Add "skip to next signal" and "complete message" shortcuts |

## Open Questions

1. **Post composition in sender view:** Should the demo provide a "generate matching post" helper, or require manual composition?
   - Leaning toward: Provide suggestions but allow manual override

2. **Message frame visualization:** How detailed should the frame assembly view be?
   - Leaning toward: Show header/length/data/MAC segments with byte counts

3. **Error simulation:** Should the demo support simulating transmission errors (missed posts, wrong feature extraction)?
   - Leaning toward: Yes, as an advanced toggle

4. **Shareable state:** Should there be a "copy demo URL" that encodes current state?
   - Leaning toward: Nice-to-have, not MVP
