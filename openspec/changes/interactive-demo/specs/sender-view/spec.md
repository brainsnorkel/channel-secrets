# Sender View

Sender UI showing draft composition, feature matching feedback, transmission progress, and post decisions.

## ADDED Requirements

### Requirement: Message input

The sender view SHALL provide an input field for the message to be transmitted.

#### Scenario: Message entry
- **WHEN** user types "HELLO" in the message input
- **THEN** the message is displayed with transmission progress indicator
- **AND** required bit sequence is calculated and shown

#### Scenario: Message encoding display
- **WHEN** a message is entered
- **THEN** the binary encoding is displayed (e.g., "HELLO" → "01001000 01000101...")
- **AND** total bits required including frame overhead is shown

### Requirement: Draft post composition

The sender view SHALL provide a text area for composing draft posts.

#### Scenario: Draft entry
- **WHEN** user types a draft post
- **THEN** real-time feature extraction is performed
- **AND** extracted bit pattern is displayed

#### Scenario: Feature matching feedback
- **WHEN** draft post features are extracted
- **THEN** comparison against next required bits is shown
- **AND** match status is indicated (✓ MATCH or ✗ NO MATCH)

### Requirement: Feature extraction display

The sender view SHALL show how each feature contributes to the bit pattern.

#### Scenario: Length feature
- **WHEN** draft post is "Hello world!" (12 chars)
- **THEN** length feature shows: "Length: 12 chars | ≥50? NO → bit 0"

#### Scenario: Media feature
- **WHEN** draft post has media checkbox unchecked
- **THEN** media feature shows: "Has media: NO → bit 0"

#### Scenario: Punctuation feature
- **WHEN** draft post ends with "!"
- **THEN** punctuation feature shows: "Ends with punctuation: YES → bit 1"

#### Scenario: Combined pattern
- **WHEN** all features are extracted
- **THEN** combined pattern is shown: "Extracted: 001 | Needed: 101 | Match: NO"

### Requirement: Post decision controls

The sender view SHALL provide buttons to publish or discard draft posts.

#### Scenario: Publish as signal
- **WHEN** draft matches required bits and user clicks "Publish"
- **THEN** post is added to feed as a signal post
- **AND** transmission progress advances by extracted bits

#### Scenario: Publish as cover
- **WHEN** draft does NOT match required bits and user clicks "Publish Anyway"
- **THEN** post is added to feed as a cover post
- **AND** transmission progress does not advance

#### Scenario: Discard draft
- **WHEN** user clicks "Discard"
- **THEN** draft is cleared
- **AND** no post is added to feed

### Requirement: Transmission progress

The sender view SHALL display message transmission progress.

#### Scenario: Progress bar
- **WHEN** message transmission is in progress
- **THEN** a progress bar shows bits sent / total bits
- **AND** percentage complete is displayed

#### Scenario: Signal post count
- **WHEN** signal posts have been published
- **THEN** counter shows "Signal posts: 3 / Cover posts: 7"

#### Scenario: Transmission complete
- **WHEN** all message bits have been transmitted
- **THEN** a completion indicator appears
- **AND** final MAC bits are noted as sent

### Requirement: Post suggestion helper

The sender view SHALL optionally suggest post modifications to match required bits.

#### Scenario: Suggestion for length
- **WHEN** current draft needs bit 1 for length but is too short
- **THEN** suggestion appears: "Add ~40 more characters to set length bit"

#### Scenario: Suggestion for punctuation
- **WHEN** current draft needs bit 1 for punctuation but lacks it
- **THEN** suggestion appears: "End with . ! or ? to set punctuation bit"

#### Scenario: Disable suggestions
- **WHEN** user toggles "Show suggestions" off
- **THEN** no suggestions are displayed
- **AND** preference is remembered
