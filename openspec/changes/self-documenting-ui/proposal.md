## Why

The StegoChannel client app implements a complex cryptographic protocol that most users won't intuitively understand. Without explanations, users may not know why messages take days to transmit, what "signal posts" mean, or how their post characteristics encode bits. A self-documenting UI reduces confusion, builds trust, and helps users make informed decisions—while maintaining plausible deniability by hiding explanations behind progressive disclosure.

## What Changes

- **Contextual tooltip system**: Add `(?)` icons throughout the UI that explain underlying mechanics (signal selection, feature extraction, epoch timing)
- **Composition assistant explanations**: Real-time feedback showing why a post matches or doesn't match required bit patterns, with tips for adjustment
- **Activity log with explanations**: Collapsible panel showing what the app is doing (fetching posts, extracting bits, accumulating message) with optional technical details
- **First-time onboarding flow**: Interactive walkthrough for new users explaining selection steganography, signal vs cover posts, and time expectations
- **Hidden help system**: Settings-accessible documentation covering protocol overview, glossary, FAQ, and security model
- **Message decode explanations**: "How was this decoded?" feature showing which posts contributed which bits
- **Status bar expansions**: Inline explanations for epoch, monitoring status, and pending message progress

## Capabilities

### New Capabilities

- `contextual-help`: Tooltip and inline explanation system with progressive disclosure; explanations hidden by default, revealed on interaction
- `onboarding-flow`: First-time user walkthrough with animated diagrams explaining the protocol; skippable for experienced users
- `activity-log`: Real-time log of app operations with optional technical detail expansion; shows post fetching, signal detection, bit extraction
- `decode-explainer`: Post-hoc explanation of how a received message was reconstructed from signal posts
- `testing-mode`: Development/testing UI mode that bypasses stealth constraints—shows all explanations, labels, and protocol details directly without progressive disclosure; activated via environment variable or URL parameter

### Modified Capabilities

- `message-sending`: Add real-time feature analysis explanations to composition workflow (why features encode specific bits, tips for matching)
- `stealth-ux`: Ensure all educational features maintain plausible deniability in production mode—hidden behind settings, boring labels, progressive disclosure; testing mode bypasses all stealth constraints

## Impact

- **UI components**: New tooltip component, collapsible explanation panels, onboarding modal sequence
- **State management**: Track onboarding completion, help preferences (show/hide technical details), activity log buffer
- **Content**: Educational copy for tooltips, onboarding screens, help pages, glossary definitions
- **Localization**: All explanatory text should be extracted for future i18n support
- **Bundle size**: Onboarding animations and help content may add ~50-100KB; consider lazy loading
- **Testing**: Onboarding flow needs E2E tests; tooltip positioning needs visual regression tests
- **Testing mode**: Environment variable `STEGO_TESTING_MODE=true` or URL param `?testing=1` activates full-disclosure UI—all labels explicit ("Signal Post", "Cover Post"), explanations always visible, no progressive disclosure needed; simplifies E2E testing and development
