## 1. Testing Mode Infrastructure

- [x] 1.1 Create `TestingModeContext` React context provider
- [x] 1.2 Implement `useTestingMode()` hook
- [x] 1.3 Add activation logic: URL param (`?testing=1`), env var, localStorage precedence
- [x] 1.4 Wrap app root with `TestingModeProvider`
- [x] 1.5 Add Vite environment variable support (`VITE_TESTING_MODE`)

## 2. Tooltip System

- [x] 2.1 Create tooltip content registry file with `TooltipId` type
- [x] 2.2 Define standard tooltip content (signal-post, cover-post, feature-bits, epoch, beacon, threshold)
- [x] 2.3 Implement `<Tooltip>` component with placement options
- [x] 2.4 Add production mode behavior: `(?)` icon, click to reveal, "Learn more" expansion
- [x] 2.5 Add testing mode behavior: inline display without interaction
- [x] 2.6 Implement keyboard accessibility (Tab focus, Enter/Space activation, Escape dismissal)
- [x] 2.7 Add ARIA attributes for screen reader support

## 3. Activity Log

- [x] 3.1 Define `LogEntry` type and `LogLevel` enum
- [x] 3.2 Implement ring buffer store (max 500 entries)
- [x] 3.3 Create activity log React context/hook for adding entries
- [x] 3.4 Add logging calls to existing code: fetch, signal detection, decode, encode, epoch
- [x] 3.5 Implement collapsible activity log panel component
- [x] 3.6 Add level filtering (info/detail/debug) with "Show technical details" toggle
- [x] 3.7 Add category filtering dropdown
- [x] 3.8 Style debug entries with monospace font in testing mode

## 4. Composition Assistant Enhancements

- [x] 4.1 Create `<FeatureAnalysisPanel>` component
- [x] 4.2 Display individual feature breakdowns (length, media, first-char) with thresholds
- [x] 4.3 Show combined encoding and required bits comparison
- [x] 4.4 Implement smart tips calculation (minimal changes needed to match)
- [x] 4.5 Add multiple path suggestions when applicable
- [x] 4.6 Add feature explanation tooltips using tooltip system
- [x] 4.7 Implement production mode: collapsed by default, expand on focus or signal detection
- [x] 4.8 Implement testing mode: always expanded with SPEC.md references

## 5. Onboarding Flow

- [x] 5.1 Create `<OnboardingModal>` container component with step state
- [x] 5.2 Implement step 1: "What is StegoChannel?" with animated diagram
- [x] 5.3 Implement step 2: "Signal vs Cover" with visual post highlighting
- [x] 5.4 Implement step 3: "How Posts Encode Bits" with interactive demo
- [x] 5.5 Implement step 4: "Time Expectations" with timeline visualization
- [x] 5.6 Implement step 5: "Your First Channel" with create/import options
- [x] 5.7 Add navigation controls (Next, Back, Skip, progress indicator)
- [x] 5.8 Add "I'm familiar with StegoChannel" shortcut on step 1
- [x] 5.9 Persist `onboardingComplete` to IndexedDB user preferences
- [x] 5.10 Add trigger conditions: first launch, no channels, testing mode inactive

## 6. Decode Explainer

- [x] 6.1 Extend message storage schema to include signal post references
- [x] 6.2 Store contributing signal posts when message is decoded
- [x] 6.3 Create `<DecodeExplainer>` expandable component
- [x] 6.4 Display signal post list with timestamps, content previews, and extracted bits
- [x] 6.5 Display error correction and HMAC verification status
- [x] 6.6 Add timeline visualization (optional toggle)
- [x] 6.7 Implement testing mode: expanded by default, show hex values and SPEC references

## 7. Help System

- [x] 7.1 Create help content in MDX format (Overview, Glossary, FAQ, Security Model)
- [x] 7.2 Create `<HelpSection>` component with lazy loading
- [x] 7.3 Add help navigation to settings with stealth label ("Sync Technical Details")
- [x] 7.4 Add testing mode: prominent "Help" link in header
- [x] 7.5 Cross-reference SPEC.md sections in help content

## 8. Stealth UX Integration

- [x] 8.1 Update post labels to respect testing mode (note vs SIGNAL/COVER)
- [x] 8.2 Update activity log terminology based on mode (sync vs signal)
- [x] 8.3 Update tooltip initial text based on mode
- [x] 8.4 Integrate onboarding discretion (disabled in testing mode)
- [x] 8.5 Update channel management navigation based on mode

## 9. Testing & Documentation

- [x] 9.1 Write unit tests for testing mode context and activation logic
- [x] 9.2 Write unit tests for tooltip component and registry
- [x] 9.3 Write unit tests for activity log ring buffer
- [x] 9.4 Write E2E tests for onboarding flow navigation
- [x] 9.5 Write visual regression tests for tooltip positioning
- [x] 9.6 Update AGENTS.md with self-documenting UI component documentation
