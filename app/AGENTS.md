# AGENTS.md - StegoChannel Client App

This file documents the architecture and components of the StegoChannel client application for AI agents working on this codebase.

## Overview

The app is a React + TypeScript client for the StegoChannel steganographic protocol. It allows users to send and receive hidden messages through social media post selection.

## Key Architectural Concepts

### Testing Mode

The app has two UX modes controlled by `TestingModeContext`:

| Mode | Purpose | Activation |
|------|---------|------------|
| Production | Stealth UX, appears as "FeedDeck" feed reader | Default |
| Testing | Full technical details, SPEC.md references visible | `?testing=1` URL param, `VITE_TESTING_MODE=true`, or localStorage |

Testing mode affects all self-documenting UI components.

### Self-Documenting UI

Components that explain themselves to users, with behavior varying by mode:

| Component | Production Mode | Testing Mode |
|-----------|-----------------|--------------|
| Tooltips | Click to reveal, "Learn more" expansion | Inline display, SPEC references |
| Activity Log | Neutral terminology ("sync") | Technical terms ("signal", "cover") |
| Post Labels | "synced" | "SIGNAL POST" / "COVER POST" |
| Decode Explainer | Collapsed | Expanded with hex values |
| Onboarding | Triggers for new users | Disabled |

## Directory Structure

```
src/
├── core/                    # Protocol implementation
│   ├── crypto/              # Cryptographic primitives
│   └── protocol/            # Message encoding/decoding
├── ui/
│   ├── components/          # React components
│   │   ├── ActivityLog/     # Ring buffer log panel
│   │   ├── CompositionAssistant/ # Post composition helper
│   │   ├── DecodeExplainer/ # Message provenance display
│   │   ├── FeatureAnalysisPanel/ # Feature breakdown
│   │   ├── HelpSection/     # Lazy-loaded help content
│   │   ├── Onboarding/      # First-launch tutorial
│   │   └── Tooltip/         # Contextual help system
│   ├── context/             # React contexts
│   └── hooks/               # Custom React hooks
├── storage/                 # IndexedDB persistence
└── e2e/                     # E2E test specifications
```

## Component Reference

### TestingModeContext (`ui/context/TestingModeContext.tsx`)

Provides testing mode state throughout the app.

```tsx
// Check current mode
const testingMode = useTestingMode();

// Programmatically toggle (persists to localStorage)
setTestingModeStorage(true);
```

Activation precedence: URL param > env var > localStorage > default (false)

### Tooltip System (`ui/components/Tooltip/`)

Contextual help with registry-based content.

```tsx
import { Tooltip } from './components/Tooltip';

<Tooltip id="signal-post" placement="top">
  <span>Signal Post</span>
</Tooltip>
```

**Files:**
- `Tooltip.tsx` - Main component with click/hover behavior
- `tooltipRegistry.ts` - Content definitions with short/long text
- `Tooltip.css` - Styling with dark mode support

**Registry IDs:** `signal-post`, `cover-post`, `feature-bits`, `epoch`, `beacon`, `threshold`

### Activity Log (`ui/components/ActivityLog/`)

Ring buffer (max 500 entries) with level/category filtering.

```tsx
const { log, info, detail, debug, entries, clear } = useActivityLog();

// Convenience loggers
info('fetch', 'Fetched 50 posts from timeline');
detail('signal', 'Detected 12 potential signal posts');
debug('decode', 'Attempting decode...', 'bytes: 0x1a2b3c...');
```

**Log Levels:** `info` (default), `detail`, `debug`
**Categories:** `fetch`, `signal`, `encode`, `decode`, `epoch`, `channel`

### Decode Explainer (`ui/components/DecodeExplainer/`)

Shows message provenance with contributing signal posts.

```tsx
import { DecodeExplainer } from './components/DecodeExplainer';

<DecodeExplainer
  message={messageWithProvenance}
  contributingPosts={posts}
  errorCorrection={eccStatus}
  hmacStatus={hmacStatus}
/>
```

**Types:**
- `ContributingPost` - Post with extracted bits and timestamp
- `ErrorCorrectionStatus` - RS decode result
- `HmacStatus` - HMAC verification result
- `MessageWithProvenance` - Decoded message with metadata

### Onboarding Flow (`ui/components/Onboarding/`)

5-step tutorial for new users.

**Steps:**
1. What is StegoChannel?
2. Signal vs Cover posts
3. How Posts Encode Bits
4. Time Expectations
5. Your First Channel

**Trigger conditions:** Testing mode inactive AND not completed AND no channels exist

**Persistence:** `onboardingComplete` stored in IndexedDB `meta` store

### Help Section (`ui/components/HelpSection/`)

Lazy-loaded help content with tabbed navigation.

**Content files (lazy-loaded):**
- `Overview.tsx` - General introduction
- `Glossary.tsx` - Term definitions
- `FAQ.tsx` - Common questions
- `SecurityModel.tsx` - Threat model explanation

### Composition Assistant (`ui/components/CompositionAssistant/`)

Helps users compose posts that match target bit patterns.

**Feature Analysis Panel:**
- Length bits (character count thresholds)
- Media presence bit
- First character category bit
- Combined encoding display
- Smart tips for minimal changes

### Hooks (`ui/hooks/`)

| Hook | Purpose |
|------|---------|
| `useActivityLog()` | Access activity log context |
| `useTestingMode()` | Check if testing mode active |
| `useChannelOperations()` | Core operations with auto-logging |
| `useOnboarding()` | Onboarding state and triggers |

## Testing

### Unit Tests (Vitest)

```bash
npm run test        # Watch mode
npm run test:run    # Single run
```

**Test files:**
- `TestingModeContext.test.tsx` - Context activation logic
- `tooltipRegistry.test.ts` - Registry content validation
- `ActivityLogContext.test.tsx` - Ring buffer behavior

### E2E Tests (Playwright - not yet configured)

Placeholder specs in `src/e2e/`:
- `onboarding.spec.ts` - Flow navigation
- `tooltip.spec.ts` - Visual regression

## Styling Conventions

- CSS files colocated with components
- BEM naming: `.component__element--modifier`
- CSS custom properties for theming
- Dark mode via `@media (prefers-color-scheme: dark)`
- Testing mode styles: `.component--testing`

## Key Implementation Notes

1. **Ring buffer efficiency**: Activity log uses array slicing, not shift operations
2. **Lazy loading**: Help content is code-split via `React.lazy()`
3. **Mode awareness**: All self-documenting components check `useTestingMode()`
4. **IndexedDB schema**: Uses `idb` library with typed stores
5. **Accessibility**: Tooltips have ARIA attributes and keyboard support
