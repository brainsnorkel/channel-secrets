## ADDED Requirements

### Requirement: Decode explainer availability
Each received message SHALL have an expandable "How was this decoded?" section that explains the reconstruction process.

#### Scenario: Explainer section present
- **WHEN** a message has been successfully received and decoded
- **THEN** a "How was this decoded?" expandable section SHALL be available on the message view

#### Scenario: In-progress messages excluded
- **WHEN** a message is still being received (incomplete bit accumulation)
- **THEN** the decode explainer SHALL NOT be available

### Requirement: Signal post attribution
The decode explainer SHALL display a list of all signal posts that contributed bits to the message, including:
- Post timestamp
- Post content preview (truncated to ~50 characters)
- Extracted bits (e.g., "0b101")
- Source platform and identifier

#### Scenario: Post list display
- **WHEN** user expands the decode explainer
- **THEN** a chronological list of contributing signal posts SHALL be displayed

#### Scenario: Post content preview
- **WHEN** a signal post contributed to the message
- **THEN** its content preview SHALL be displayed (truncated with "..." if over 50 characters)

#### Scenario: Bit contribution display
- **WHEN** a signal post contributed bits
- **THEN** the extracted bits SHALL be displayed in binary format (e.g., "→ 0b101")

### Requirement: Verification status display
The decode explainer SHALL display verification information:
- Error correction status (number of errors detected and corrected)
- HMAC authentication result (verified or failed)

#### Scenario: Clean decode display
- **WHEN** a message was decoded with zero errors
- **AND** HMAC verification passed
- **THEN** explainer SHALL display "Error correction: 0 errors detected"
- **AND** explainer SHALL display "Authentication: ✓ HMAC verified"

#### Scenario: Error correction display
- **WHEN** a message required error correction
- **THEN** explainer SHALL display "Error correction: N errors corrected"
- **AND** the corrected bit positions SHALL be indicated if available

#### Scenario: Authentication failure display
- **WHEN** HMAC verification failed
- **THEN** explainer SHALL display "Authentication: ✗ HMAC failed"
- **AND** a warning SHALL be prominently displayed

### Requirement: Testing mode enhanced display
When testing mode is active, the decode explainer SHALL display additional technical details:
- Raw hex values for accumulated bits
- HMAC expected vs actual values (if failed)
- Reed-Solomon syndrome values
- Epoch key derivation details

#### Scenario: Testing mode expanded by default
- **WHEN** testing mode is active
- **THEN** the decode explainer SHALL be expanded by default

#### Scenario: Testing mode hex display
- **WHEN** testing mode is active
- **THEN** raw hexadecimal bit values SHALL be displayed alongside binary

#### Scenario: Testing mode SPEC reference
- **WHEN** testing mode is active
- **THEN** relevant SPEC.md section references SHALL be displayed (e.g., "See SPEC.md §8.2")

### Requirement: Signal post data persistence
The system SHALL store signal post references with each received message in IndexedDB to enable the decode explainer.

#### Scenario: Post references stored
- **WHEN** a message is fully decoded
- **THEN** the list of contributing signal posts SHALL be stored with the message

#### Scenario: Post references retrievable
- **WHEN** user views a historical message
- **AND** expands the decode explainer
- **THEN** the original signal post list SHALL be retrieved and displayed

### Requirement: Decode timeline visualization
The decode explainer SHALL optionally display a timeline view showing when each signal post was received.

#### Scenario: Timeline view toggle
- **WHEN** user clicks "Show timeline"
- **THEN** a visual timeline SHALL display signal posts on a time axis

#### Scenario: Timeline spans multiple days
- **WHEN** message reconstruction spanned multiple days
- **THEN** the timeline SHALL show day boundaries clearly marked
