# Implementation Tasks

## 1. Project Foundation

- [x] 1.1 Create single HTML file scaffold with basic structure (head, body, styles, script sections)
- [x] 1.2 Set up CSS reset and base layout (CSS Grid for split-screen, CSS variables for theming)
- [x] 1.3 Implement shared state object structure (posts, epoch, sender, receiver, channelKey)
- [x] 1.4 Create reactive state update system (simple pub/sub for state changes)

## 2. Cryptographic Utilities

- [x] 2.1 Implement HKDF-SHA256 using Web Crypto API for key derivation
- [x] 2.2 Implement SHA-256 hash function for post hashing
- [x] 2.3 Implement hash-to-fraction conversion for threshold comparison
- [x] 2.4 Implement HMAC-SHA256 for MAC generation/verification
- [x] 2.5 Create deterministic PRNG from seed for mock beacon sequence

## 3. Mock Beacon System

- [x] 3.1 Implement beacon state management (mode, seed, current epoch, timer)
- [x] 3.2 Implement fixed seed mode with deterministic beacon value generation
- [x] 3.3 Implement accelerated mode with configurable speed multiplier
- [x] 3.4 Implement manual mode with "Next Epoch" button
- [x] 3.5 Implement epoch key derivation on beacon value change
- [x] 3.6 Create beacon display UI component (epoch number, value, mode indicator)

## 4. Mock Feed System

- [x] 4.1 Implement post data structure (id, author, content, timestamp, hasMedia, hash, features)
- [x] 4.2 Implement post storage with add/list operations
- [x] 4.3 Implement post hash computation (author + content + epoch → SHA-256)
- [x] 4.4 Implement feature extraction (length bit, media bit, punctuation bit)
- [x] 4.5 Create timeline rendering component with post cards
- [x] 4.6 Implement new post animation (highlight on insert)

## 5. Sender View

- [x] 5.1 Create sender panel layout (message input, draft area, progress bar, controls)
- [x] 5.2 Implement message input with binary encoding display
- [x] 5.3 Implement draft composition text area
- [x] 5.4 Implement real-time feature extraction display for draft
- [x] 5.5 Implement bit pattern matching comparison (extracted vs needed)
- [x] 5.6 Create post decision buttons (Publish, Publish as Cover, Discard)
- [x] 5.7 Implement transmission progress bar and bit counter
- [x] 5.8 Implement signal/cover post counter
- [x] 5.9 Add optional post suggestion helper for matching bits

## 6. Receiver View

- [x] 6.1 Create receiver panel layout (feed display, decode progress, frame status)
- [x] 6.2 Implement feed display with signal/cover classification
- [x] 6.3 Implement signal detection logic (hash < threshold comparison)
- [x] 6.4 Implement bit extraction from signal posts
- [x] 6.5 Implement bit buffer accumulation with byte alignment display
- [x] 6.6 Implement message frame parsing (header, length, data, MAC)
- [x] 6.7 Implement partial message decoding display
- [x] 6.8 Implement MAC verification on message complete
- [x] 6.9 Create "waiting for signal" status indicator

## 7. Inspector Panel

- [x] 7.1 Create inspector panel layout (toggleable sidebar/overlay)
- [x] 7.2 Implement toggle button and keyboard shortcut (I key)
- [x] 7.3 Implement key derivation chain display (channel key → epoch key → threshold)
- [x] 7.4 Implement post selection for detailed hash analysis
- [x] 7.5 Implement hash calculation breakdown display
- [x] 7.6 Implement feature extraction breakdown for selected post
- [x] 7.7 Implement message frame state visualization
- [x] 7.8 Implement protocol event log with filtering
- [x] 7.9 Implement observer vs keyholder view comparison tabs

## 8. Demo Shell & Controls

- [x] 8.1 Create main application shell with header (title, key display, beacon status)
- [x] 8.2 Implement split-screen layout container
- [x] 8.3 Implement step mode execution (pause at decisions, "Next Step" button)
- [x] 8.4 Implement auto mode execution with speed slider
- [x] 8.5 Implement mode switching (step ↔ auto) mid-execution
- [x] 8.6 Implement channel key configuration (default key, custom key entry)
- [x] 8.7 Implement reset button functionality
- [x] 8.8 Create responsive breakpoints for smaller screens (stack vertically)

## 9. Demo Scenarios

- [x] 9.1 Create scenario data structure (name, description, seed, message, prePosts)
- [x] 9.2 Implement scenario selection menu UI
- [x] 9.3 Implement scenario loading (reset + apply configuration)
- [x] 9.4 Create "Quick Demo" scenario (short message, fast completion)
- [x] 9.5 Create "Educational Walkthrough" scenario with step annotations
- [x] 9.6 Create "Epoch Boundary" edge case scenario
- [x] 9.7 Create "Long Message" multi-frame scenario
- [x] 9.8 Implement scenario progress save/resume to localStorage
- [ ] 9.9 Implement custom scenario creation form
- [ ] 9.10 Add scenario narration panel (optional text explanations)

## 10. Polish & Documentation

- [x] 10.1 Add loading state and initialization animation
- [x] 10.2 Add error handling for crypto operations
- [x] 10.3 Test in Chrome, Firefox, Safari (latest versions)
- [x] 10.4 Add inline help tooltips for key concepts
- [x] 10.5 Add link to SPEC.md in header
- [x] 10.6 Write brief usage instructions in demo footer
- [ ] 10.7 Minify CSS/JS for production (optional, inline)
