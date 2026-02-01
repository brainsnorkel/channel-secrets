## MODIFIED Requirements

### Requirement: Hidden channel interface
The system SHALL not prominently display steganography-related features in the main UI. Testing mode SHALL bypass this requirement.

#### Scenario: Channel management location
- **WHEN** user wants to manage channels
- **AND** testing mode is inactive
- **THEN** system SHALL require navigation to settings/preferences area

#### Scenario: No visible indicators by default
- **WHEN** application is in default view
- **AND** testing mode is inactive
- **THEN** system SHALL not show obvious indicators of secret messaging capability

#### Scenario: Testing mode explicit labels
- **WHEN** testing mode is active
- **THEN** system SHALL display explicit labels ("SIGNAL POST", "COVER POST", "Channel: xyz")

#### Scenario: Testing mode prominent navigation
- **WHEN** testing mode is active
- **THEN** channel management SHALL be accessible via prominent header link

### Requirement: Subtle message indicators
The system SHALL display decoded messages in a way that appears as normal app functionality. Testing mode SHALL bypass this requirement.

#### Scenario: Message as note
- **WHEN** decoded message is displayed
- **AND** testing mode is inactive
- **THEN** system SHALL present it as a "note" or "annotation" attached to posts

#### Scenario: Testing mode explicit messages
- **WHEN** decoded message is displayed
- **AND** testing mode is active
- **THEN** system SHALL display with explicit "DECODED MESSAGE" header

#### Scenario: Opt-in visibility
- **WHEN** channel is loaded but user hasn't unlocked
- **THEN** system SHALL not show any secret message content

### Requirement: Composition mode disguise
The system SHALL present the composition assistant as a standard post editor. Testing mode SHALL show full technical details.

#### Scenario: Editor appearance
- **WHEN** user composes a post
- **AND** testing mode is inactive
- **THEN** system SHALL show a normal-looking text editor with standard formatting options

#### Scenario: Feature hints as tips
- **WHEN** showing feature matching guidance
- **AND** testing mode is inactive
- **THEN** system SHALL present as "posting tips" or "suggestions" not "required features"

#### Scenario: Testing mode full disclosure
- **WHEN** user composes a post
- **AND** testing mode is active
- **THEN** system SHALL show explicit "FEATURE ANALYSIS" panel with full technical breakdown

### Requirement: Onboarding discretion
The system SHALL introduce features progressively without immediately revealing full capability. Testing mode SHALL disable onboarding entirely.

#### Scenario: First-time experience
- **WHEN** new user opens application
- **AND** testing mode is inactive
- **THEN** system SHALL present as normal feed reader, with channels as "advanced feature"

#### Scenario: Feature discovery
- **WHEN** user explores settings
- **AND** testing mode is inactive
- **THEN** system SHALL present channel management with neutral terminology

#### Scenario: Testing mode no onboarding
- **WHEN** testing mode is active
- **THEN** onboarding flow SHALL be disabled entirely

## ADDED Requirements

### Requirement: Help section stealth labeling
The help/documentation section SHALL use non-revealing labels in production mode.

#### Scenario: Production mode help label
- **WHEN** testing mode is inactive
- **THEN** the help section SHALL be labeled "Sync Technical Details" or similar boring terminology

#### Scenario: Testing mode help label
- **WHEN** testing mode is active
- **THEN** the help section SHALL be labeled "Help" with prominent header placement

### Requirement: Activity log stealth
The activity log SHALL use non-revealing terminology in production mode.

#### Scenario: Production mode log entries
- **WHEN** testing mode is inactive
- **THEN** log entries SHALL use neutral terms ("sync", "refresh", "update") not ("signal", "decode", "bits")

#### Scenario: Testing mode log entries
- **WHEN** testing mode is active
- **THEN** log entries SHALL use explicit technical terminology ("signal post detected", "extracted bits: 0b101")

### Requirement: Tooltip content stealth
Tooltip content SHALL be appropriate for the current mode.

#### Scenario: Production mode tooltip text
- **WHEN** testing mode is inactive
- **AND** user views a tooltip
- **THEN** initial text SHALL use neutral language suitable for the cover story

#### Scenario: Testing mode tooltip text
- **WHEN** testing mode is active
- **THEN** tooltips SHALL display full technical explanations inline without interaction
