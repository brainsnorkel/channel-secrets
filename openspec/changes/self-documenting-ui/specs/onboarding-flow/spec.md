## ADDED Requirements

### Requirement: Onboarding trigger conditions
The system SHALL display the onboarding flow when ALL of the following conditions are met:
- User has not completed onboarding (`onboardingComplete` is false or absent)
- No channels are configured
- Testing mode is inactive

#### Scenario: First launch triggers onboarding
- **WHEN** user launches the app for the first time
- **AND** no channels exist
- **AND** testing mode is inactive
- **THEN** the onboarding modal sequence SHALL be displayed

#### Scenario: Testing mode skips onboarding
- **WHEN** testing mode is active
- **THEN** the onboarding flow SHALL NOT be displayed regardless of other conditions

#### Scenario: Returning user skips onboarding
- **WHEN** user has previously completed onboarding
- **THEN** the onboarding flow SHALL NOT be displayed

### Requirement: Onboarding step sequence
The onboarding flow SHALL consist of 5 sequential steps presented as modal dialogs with a progress indicator:

| Step | Title | Content Type |
|------|-------|--------------|
| 1 | What is StegoChannel? | Animated diagram of selection-based steganography |
| 2 | Signal vs Cover | Visual showing ~25% of posts highlighted as signal |
| 3 | How Posts Encode Bits | Interactive demo: edit post → see bits change |
| 4 | Time Expectations | Timeline showing multi-day transmission is normal |
| 5 | Your First Channel | Prompt to create or import a channel key |

#### Scenario: Step 1 content
- **WHEN** user is on onboarding step 1
- **THEN** an animated diagram SHALL illustrate selection-based steganography
- **AND** text SHALL explain that message hiding is in post selection, not content

#### Scenario: Step 2 content
- **WHEN** user is on onboarding step 2
- **THEN** a visual SHALL show a stream of posts with approximately 25% highlighted
- **AND** text SHALL explain signal posts carry data while cover posts provide deniability

#### Scenario: Step 3 interactive demo
- **WHEN** user is on onboarding step 3
- **AND** user modifies the sample post text
- **THEN** the displayed feature bits SHALL update in real-time
- **AND** the encoded bit value SHALL change accordingly

#### Scenario: Step 4 timeline
- **WHEN** user is on onboarding step 4
- **THEN** a timeline SHALL show that a typical message takes 2-7 days to transmit
- **AND** text SHALL explain this is normal due to the low-bandwidth protocol (~8 bits/day)

#### Scenario: Step 5 channel prompt
- **WHEN** user is on onboarding step 5
- **THEN** options SHALL be presented to create a new channel or import an existing key

### Requirement: Onboarding navigation
Each onboarding step SHALL provide navigation controls:
- "Next" button to proceed to the next step
- "Back" button to return to the previous step (except step 1)
- "Skip" button to exit onboarding entirely
- Progress indicator showing current step (e.g., "Step 2 of 5")

#### Scenario: Next button advances
- **WHEN** user clicks "Next" on any step except step 5
- **THEN** the next step SHALL be displayed

#### Scenario: Back button returns
- **WHEN** user clicks "Back" on steps 2-5
- **THEN** the previous step SHALL be displayed

#### Scenario: Skip button exits
- **WHEN** user clicks "Skip" on any step
- **THEN** the onboarding modal SHALL close
- **AND** `onboardingComplete` SHALL be set to true

#### Scenario: Final step completion
- **WHEN** user completes step 5 (creates or imports channel)
- **THEN** the onboarding modal SHALL close
- **AND** `onboardingComplete` SHALL be set to true

### Requirement: Experienced user shortcut
Step 1 SHALL include a "I'm familiar with StegoChannel" link that skips directly to step 5 (channel setup).

#### Scenario: Familiar user shortcut
- **WHEN** user clicks "I'm familiar with StegoChannel" on step 1
- **THEN** the onboarding SHALL jump directly to step 5

### Requirement: Onboarding state persistence
The system SHALL persist onboarding completion state in IndexedDB under user preferences.

#### Scenario: Onboarding state persists across sessions
- **WHEN** user completes or skips onboarding
- **AND** user closes and reopens the app
- **THEN** onboarding SHALL NOT be shown again

#### Scenario: Clear data resets onboarding
- **WHEN** user clears app data (IndexedDB)
- **AND** user reopens the app
- **THEN** onboarding SHALL be shown again (if no channels exist)
