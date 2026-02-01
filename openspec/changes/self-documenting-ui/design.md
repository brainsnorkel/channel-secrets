## Context

The StegoChannel client app (specified in `stegochannel-client-app` change) implements a complex cryptographic protocol. Users need to understand concepts like signal posts, feature extraction, epoch keys, and multi-day transmission timelines—but the app must also maintain plausible deniability as a normal feed reader.

**Current state**: The parent app design (D6: Stealth UX Pattern) establishes "FeedDeck" as the cover story. This design adds educational UI elements that work within that constraint.

**Constraints**:
- Production mode: All explanations behind progressive disclosure (tooltips, expandable sections, hidden settings)
- Testing mode: Full disclosure, explicit labels, all explanations visible
- Content must be accurate to SPEC.md but accessible to non-technical users
- Lazy-loadable to minimize bundle impact

**Stakeholders**: New users learning the protocol, developers testing the app, power users wanting technical details

## Goals / Non-Goals

**Goals:**
- Help users understand how the protocol works without leaving the app
- Provide real-time feedback during message composition explaining feature matching
- Show activity log with optional technical details for debugging/transparency
- Support testing mode that bypasses all stealth constraints
- Keep educational content accurate and in sync with SPEC.md

**Non-Goals:**
- Comprehensive protocol documentation (users can read SPEC.md for full details)
- Video tutorials or external learning resources
- Multi-language support in initial version (structure for i18n, but English only)
- Gamification or achievement systems for learning

## Decisions

### D1: Testing Mode Architecture

**Decision**: Global context provider with environment/URL-based activation.

```typescript
// Activation precedence (first match wins):
// 1. URL param: ?testing=1
// 2. Environment: import.meta.env.VITE_TESTING_MODE === 'true'
// 3. localStorage: localStorage.getItem('stego_testing_mode') === 'true'
// 4. Default: false (production mode)

const TestingModeContext = createContext<boolean>(false);

function useTestingMode(): boolean {
  return useContext(TestingModeContext);
}
```

**Behavior differences**:

| Aspect | Production Mode | Testing Mode |
|--------|-----------------|--------------|
| Post labels | "Note" / hidden | "SIGNAL POST" / "COVER POST" |
| Feature bits | Shown on hover | Always visible with breakdown |
| Activity log | Collapsed, summary only | Expanded, full technical details |
| Tooltips | Require click/hover | Inline, always shown |
| Onboarding | Skippable modal flow | Disabled (assume familiarity) |
| Help section | Hidden in settings | Prominent link in header |

**Rationale**: Single boolean context keeps components simple. URL param allows sharing testing links. localStorage allows persistent dev preference.

### D2: Tooltip Component Design

**Decision**: Unified `<Tooltip>` component with content registry.

```typescript
interface TooltipProps {
  id: TooltipId;           // Key into content registry
  children: ReactNode;     // Element that triggers tooltip
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

// Content registry (separate file for i18n extraction)
const TOOLTIP_CONTENT: Record<TooltipId, { short: string; long: string }> = {
  'signal-post': {
    short: 'This post carries message data',
    long: 'Selected as signal because hash(post_id + epoch_key) < threshold (~25% of posts)'
  },
  'feature-bits': {
    short: '3 bits encoded by post characteristics',
    long: 'Length (≥100 chars = 1), Media (has image = 1), First char (letter = 1)'
  },
  // ...
};
```

**Production behavior**: Shows `(?)` icon; click reveals short text; "Learn more" expands to long text.

**Testing behavior**: Shows long text inline, no interaction needed.

**Rationale**: Registry pattern enables i18n, keeps components clean, ensures consistency.

### D3: Activity Log Architecture

**Decision**: Ring buffer with structured log entries and detail levels.

```typescript
type LogLevel = 'info' | 'detail' | 'debug';

interface LogEntry {
  timestamp: number;
  level: LogLevel;
  category: 'fetch' | 'signal' | 'decode' | 'encode' | 'epoch' | 'error';
  message: string;           // Human-readable summary
  technical?: string;        // Technical details (shown in testing mode or on expand)
  data?: Record<string, unknown>;  // Structured data for inspection
}

// Ring buffer: max 500 entries, oldest discarded
```

**Display rules**:
- Production: Show `info` level, collapse `detail`/`debug` behind "Show technical details"
- Testing: Show all levels, `debug` in monospace with syntax highlighting

**Persistence**: Activity log is ephemeral (memory only). Not stored in IndexedDB.

**Rationale**: Ring buffer prevents memory bloat. Structured entries enable filtering. Level system supports both casual and technical users.

### D4: Composition Assistant Explanations

**Decision**: Inline feature analysis panel in compose view.

```
┌─────────────────────────────────────────────────┐
│ [Compose post]                                  │
│ ┌─────────────────────────────────────────────┐ │
│ │ Just finished an amazing book about...      │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ┌─ Feature Analysis ─────────────────────────┐ │
│ │ Length: 42 chars → 0 (need ≥100 for 1)     │ │
│ │ Media: none → 0                             │ │
│ │ First: "J" (letter) → 1                     │ │
│ │                                             │ │
│ │ Encodes: 0b001                              │ │
│ │ Need: 0b101   ❌ No match                   │ │
│ │                                             │ │
│ │ 💡 Add 58+ characters to match              │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

**Production mode**: Feature analysis collapsed by default; expands on focus or when signal post detected.

**Testing mode**: Always expanded with full breakdown.

**Smart tips**: System suggests minimal changes to achieve match (e.g., "add 58 chars" not "make it longer").

**Rationale**: Real-time feedback helps users craft matching posts naturally. Tips reduce trial-and-error.

### D5: Onboarding Flow Structure

**Decision**: 5-step modal sequence with progress indicator.

| Step | Title | Content |
|------|-------|---------|
| 1 | What is StegoChannel? | Animated diagram: selection-based steganography concept |
| 2 | Signal vs Cover | Visual of post stream with 25% highlighted as signal |
| 3 | How Posts Encode Bits | Interactive: change post → see bits change |
| 4 | Time Expectations | Timeline showing multi-day transmission is normal |
| 5 | Your First Channel | Prompt to create or import a channel key |

**Persistence**: `onboardingComplete: boolean` in user preferences (IndexedDB).

**Skip logic**:
- "Skip" button on every step
- "I'm familiar with StegoChannel" link on step 1 jumps to step 5
- Testing mode: Onboarding disabled entirely

**Trigger**: Shown on first app launch when no channels exist.

**Rationale**: Progressive disclosure—users learn enough to get started without information overload.

### D6: Decode Explainer UI

**Decision**: Expandable section on received messages.

```
┌─────────────────────────────────────────────────┐
│ 📨 Message from @alice                          │
│ "Meet Thursday at 3pm"                          │
│ Received: Feb 1, 2026 14:32                     │
│                                                 │
│ ▸ How was this decoded?                         │
└─────────────────────────────────────────────────┘

[Expanded:]
┌─────────────────────────────────────────────────┐
│ ▾ How was this decoded?                         │
│                                                 │
│ Reconstructed from 6 signal posts over 2 days:  │
│                                                 │
│ Post 1 (Jan 31 09:12): "Just got..." → 0b101   │
│ Post 2 (Jan 31 14:45): "Anyone..." → 0b011     │
│ Post 3 (Jan 31 18:22): "New blog..." → 0b110   │
│ Post 4 (Feb 1 08:15): "Morning..." → 0b001     │
│ Post 5 (Feb 1 11:30): "Check out..." → 0b100   │
│ Post 6 (Feb 1 14:02): "Finally..." → 0b010     │
│                                                 │
│ Error correction: 0 errors detected             │
│ Authentication: ✓ HMAC verified                 │
└─────────────────────────────────────────────────┘
```

**Data source**: Store signal post references with each received message in IndexedDB.

**Testing mode**: Expanded by default; includes raw hex values for bits and HMAC.

**Rationale**: Transparency builds trust. Users can verify the app isn't fabricating messages.

### D7: Help System Organization

**Decision**: Settings-accessible help with boring label for stealth.

**Navigation**: Settings → Advanced → Sync Technical Details (stealth label for "Help")

**Sections**:

| Section | Content |
|---------|---------|
| Overview | What is selection steganography (1 paragraph + diagram) |
| Glossary | Signal post, cover post, epoch, beacon, feature bits, channel key |
| FAQ | "Why so slow?", "What if post deleted?", "Is this secure?", etc. |
| Security Model | What's protected, what's not, threat assumptions |
| Protocol Reference | Link to SPEC.md (external or embedded) |

**Testing mode**: Help accessible via prominent "Help" link in header (no stealth label).

**Implementation**: Static MDX content, lazy-loaded when help section opened.

**Rationale**: Users who need help can find it; casual observers see boring settings label.

### D8: Content Accuracy Strategy

**Decision**: Single source of truth with cross-references.

- All educational content references SPEC.md section numbers
- Glossary definitions must match SPEC.md terminology exactly
- Feature extraction explanation must match SPEC.md Section 8.2
- Threshold calculation must match SPEC.md Section 7

**Review process**: When SPEC.md changes, grep for section references and update affected content.

**Testing mode bonus**: Show SPEC.md section references inline (e.g., "See SPEC.md §8.2")

**Rationale**: Prevents documentation drift. Users can cross-reference official spec.

## Risks / Trade-offs

**[Risk] Content becomes stale** → SPEC.md updates may not propagate to UI content.
*Mitigation*: Section references enable grep-based auditing. Add spec version check in CI.

**[Risk] Onboarding friction** → Users may skip and remain confused.
*Mitigation*: Make onboarding short (5 steps, <2 min). Show contextual tips later if onboarding skipped.

**[Risk] Testing mode leaks to production** → URL param could expose app nature.
*Mitigation*: Consider disabling URL param in production builds. Environment variable is safer.

**[Risk] Bundle size bloat** → Onboarding animations and help content add weight.
*Mitigation*: Lazy-load help section. Use CSS animations over JS where possible. Target <100KB additional.

**[Trade-off] English only initially** → Non-English users get degraded experience.
*Accepted*: Content registry pattern enables future i18n. Prioritize accuracy over translation breadth.

**[Trade-off] No video tutorials** → Some users learn better from video.
*Accepted*: Video adds hosting complexity and can't be updated easily. Text + diagrams sufficient for MVP.

## Open Questions

1. **Onboarding analytics**: Should we track which steps users skip most often? (Privacy implications vs. UX improvement)

2. **Help search**: Should the help section have search, or is hierarchical navigation sufficient?

3. **Tooltip accessibility**: How to make tooltips keyboard-navigable and screen-reader friendly?

4. **Activity log export**: Should users be able to export activity log for debugging? (Could leak sensitive timing info)
