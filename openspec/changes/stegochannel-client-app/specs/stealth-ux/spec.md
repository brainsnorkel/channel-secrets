## ADDED Requirements

### Requirement: Feed reader appearance
The system SHALL present as a standard multi-column feed reader application.

#### Scenario: Default view
- **WHEN** user opens application
- **THEN** system SHALL display familiar feed reader layout (columns, cards, timeline)

#### Scenario: Plausible cover story
- **WHEN** observer views the application
- **THEN** application SHALL appear to be "a Bluesky client with RSS support"

### Requirement: Hidden channel interface
The system SHALL not prominently display steganography-related features in the main UI.

#### Scenario: Channel management location
- **WHEN** user wants to manage channels
- **THEN** system SHALL require navigation to settings/preferences area

#### Scenario: No visible indicators by default
- **WHEN** application is in default view
- **THEN** system SHALL not show obvious indicators of secret messaging capability

### Requirement: Subtle message indicators
The system SHALL display decoded messages in a way that appears as normal app functionality.

#### Scenario: Message as note
- **WHEN** decoded message is displayed
- **THEN** system SHALL present it as a "note" or "annotation" attached to posts

#### Scenario: Opt-in visibility
- **WHEN** channel is loaded but user hasn't unlocked
- **THEN** system SHALL not show any secret message content

### Requirement: Generic notifications
The system SHALL use non-revealing notification text for new messages.

#### Scenario: Desktop notification
- **WHEN** new message is decoded
- **THEN** system SHALL show generic text like "New activity" not "Secret message received"

#### Scenario: Notification settings
- **WHEN** user configures notifications
- **THEN** system SHALL allow disabling notifications entirely for maximum stealth

### Requirement: Composition mode disguise
The system SHALL present the composition assistant as a standard post editor.

#### Scenario: Editor appearance
- **WHEN** user composes a post
- **THEN** system SHALL show a normal-looking text editor with standard formatting options

#### Scenario: Feature hints as tips
- **WHEN** showing feature matching guidance
- **THEN** system SHALL present as "posting tips" or "suggestions" not "required features"

### Requirement: Quick hide
The system SHALL support quickly hiding sensitive UI elements.

#### Scenario: Panic shortcut
- **WHEN** user presses escape key or designated shortcut
- **THEN** system SHALL immediately hide all channel-related UI and show normal feed view

#### Scenario: Lock on blur
- **WHEN** application loses focus (optional setting)
- **THEN** system SHALL lock and require passphrase to show sensitive elements

### Requirement: Incognito indicators
The system SHALL provide subtle indicators for power users without alerting casual observers.

#### Scenario: Status dot
- **WHEN** channel has pending messages
- **THEN** system MAY show a small, ambiguous indicator (like unread count)

#### Scenario: Transmission progress
- **WHEN** message is being transmitted
- **THEN** system SHALL show progress in a non-obvious location (settings, about panel)

### Requirement: Normal network patterns
The system SHALL avoid distinctive network behavior that could reveal its purpose.

#### Scenario: Consistent polling
- **WHEN** fetching feeds
- **THEN** system SHALL poll on regular schedule regardless of message activity

#### Scenario: No burst activity
- **WHEN** message is received or sent
- **THEN** system SHALL not trigger unusual patterns of API calls

### Requirement: Standard browser footprint
The system SHALL avoid unusual browser storage or behavior patterns.

#### Scenario: IndexedDB naming
- **WHEN** storing data
- **THEN** system SHALL use generic database names like "feed_cache" not "stegochannel_keys"

#### Scenario: LocalStorage avoidance
- **WHEN** choosing storage mechanism
- **THEN** system SHALL prefer IndexedDB over easily-inspectable localStorage

### Requirement: Export as normal backup
The system SHALL disguise data exports as normal application backups.

#### Scenario: Export filename
- **WHEN** user exports data
- **THEN** system SHALL use generic filename like "feeddeck-backup.dat"

#### Scenario: Export format
- **WHEN** exporting
- **THEN** system SHALL use encrypted format that appears as generic binary data

### Requirement: Onboarding discretion
The system SHALL introduce features progressively without immediately revealing full capability.

#### Scenario: First-time experience
- **WHEN** new user opens application
- **THEN** system SHALL present as normal feed reader, with channels as "advanced feature"

#### Scenario: Feature discovery
- **WHEN** user explores settings
- **THEN** system SHALL present channel management with neutral terminology
