## Why

The StegoChannel protocol is conceptually elegant but difficult to understand without seeing it in action. The cryptographic decisions (which posts are signals, how bits are extracted, how the message frame assembles) are invisible in normal operation—that's the point of steganography. An interactive demo that runs sender and receiver side-by-side with an inspector panel would make the protocol tangible, educational, and demonstrable without requiring external services or real social media accounts.

## What Changes

- **New interactive demo application**: A self-contained web page that simulates the entire StegoChannel protocol locally
- **Split-screen sender/receiver views**: See both perspectives simultaneously, with real-time updates as posts flow between them
- **Inspector panel**: Reveal the cryptographic layer—hash comparisons, threshold decisions, bit extraction, message frame assembly
- **Mock social network**: In-memory post feed that both sender and receiver interact with, no external APIs
- **Simulated beacon system**: Deterministic or accelerated epochs for reproducible demos
- **Step-through mode**: Pause and advance through protocol decisions for educational purposes
- **Auto-play mode**: Continuous demo for presentations or exploration

## Capabilities

### New Capabilities

- `demo-shell`: Main application shell with split-screen layout, mode switching (step/auto), and shared state management
- `mock-feed`: In-memory social network simulation—post storage, timeline rendering, cross-view synchronization
- `mock-beacon`: Simulated beacon system with fixed seeds, accelerated time, or manual epoch advancement
- `sender-view`: Sender UI showing draft composition, feature matching feedback, transmission progress, and post decisions
- `receiver-view`: Receiver UI showing feed monitoring, signal detection indicators, message decoding progress, and frame assembly
- `inspector-panel`: Debug/educational overlay showing hash calculations, threshold comparisons, bit extraction logic, key derivation chain, and message frame state
- `demo-scenarios`: Pre-built demonstration scenarios with canned messages and deterministic seeds for reproducible walkthroughs

### Modified Capabilities

(none—this is a standalone demo, not modifying existing specs)

## Impact

- **New codebase**: Single HTML page with embedded JS/CSS, zero build step, works offline
- **Dependencies**: None external—uses only Web Crypto API and vanilla JS
- **Documentation**: Could be linked from README.md as "Try the interactive demo"
- **Educational value**: Makes the protocol accessible to non-cryptographers
- **Testing aid**: Provides a visual debugger for protocol implementation work
