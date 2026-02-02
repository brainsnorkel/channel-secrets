# Receiver View

Receiver UI showing feed monitoring, signal detection indicators, message decoding progress, and frame assembly.

## ADDED Requirements

### Requirement: Feed monitoring display

The receiver view SHALL display the incoming post feed with signal/cover classification.

#### Scenario: Feed display
- **WHEN** posts exist in the feed
- **THEN** they are displayed in chronological order (newest first)
- **AND** each post shows author, content, and timestamp

#### Scenario: Signal post indicator
- **WHEN** a post is classified as a signal post
- **THEN** it displays a signal indicator icon (e.g., 🔍 or highlighted border)
- **AND** extracted bits are shown next to the post

#### Scenario: Cover post indicator
- **WHEN** a post is classified as a cover post
- **THEN** it displays a muted/grayed style
- **AND** "(cover)" label appears

### Requirement: Signal detection logic

The receiver view SHALL classify posts as signal or cover based on hash threshold.

#### Scenario: Hash below threshold
- **WHEN** post hash < epoch threshold (e.g., 0.15 < 0.25)
- **THEN** post is classified as SIGNAL
- **AND** features are extracted for message bits

#### Scenario: Hash above threshold
- **WHEN** post hash ≥ epoch threshold (e.g., 0.73 ≥ 0.25)
- **THEN** post is classified as COVER
- **AND** post is ignored for message decoding

### Requirement: Bit extraction display

The receiver view SHALL show extracted bits from each signal post.

#### Scenario: Bit display on signal post
- **WHEN** a signal post is detected
- **THEN** extracted bits are shown (e.g., "[bits: 101]")
- **AND** bits are added to the accumulated message stream

#### Scenario: Accumulated bit stream
- **WHEN** multiple signal posts have been received
- **THEN** accumulated bit stream is displayed
- **AND** byte boundaries are visually marked

### Requirement: Message decoding progress

The receiver view SHALL display message decoding as bits accumulate.

#### Scenario: Partial message display
- **WHEN** enough bits for partial message exist
- **THEN** decoded characters are shown with placeholders for remaining
- **AND** progress indicator shows "Received: 24/56 bits"

#### Scenario: Frame parsing
- **WHEN** header bits are received
- **THEN** frame structure is displayed: "[HDR: ✓] [LEN: 5] [DATA: HEL__] [MAC: pending]"

#### Scenario: Message complete
- **WHEN** all message bits including MAC are received
- **THEN** full decoded message is displayed
- **AND** MAC verification status is shown (✓ valid or ✗ invalid)

### Requirement: Frame assembly visualization

The receiver view SHALL show message frame assembly in progress.

#### Scenario: Header detection
- **WHEN** frame header bits (0xA5) are detected
- **THEN** header section shows "Header: 0xA5 ✓ (sync found)"

#### Scenario: Length field
- **WHEN** length field bits are received
- **THEN** length section shows "Length: 5 bytes expected"

#### Scenario: Data accumulation
- **WHEN** data bytes are being received
- **THEN** data section shows partial decode with byte count
- **AND** ASCII representation where possible

#### Scenario: MAC verification
- **WHEN** MAC bits are received
- **THEN** MAC is computed over received data
- **AND** comparison result is displayed

### Requirement: Waiting state

The receiver view SHALL indicate when waiting for more posts.

#### Scenario: Waiting for signal
- **WHEN** no new signal posts have arrived
- **THEN** status shows "Waiting for signal posts..."
- **AND** last signal post timestamp is displayed

#### Scenario: Waiting for specific bits
- **WHEN** message decoding is in progress
- **THEN** status shows how many more bits are needed
- **AND** "Need 32 more bits (≈11 signal posts)"
