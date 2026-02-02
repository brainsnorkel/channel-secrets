# Inspector Panel

Debug/educational overlay showing hash calculations, threshold comparisons, bit extraction logic, key derivation chain, and message frame state.

## ADDED Requirements

### Requirement: Toggle visibility

The inspector panel SHALL be toggleable via a button or keyboard shortcut.

#### Scenario: Toggle via button
- **WHEN** user clicks the inspector toggle button
- **THEN** inspector panel visibility toggles
- **AND** button state reflects current visibility

#### Scenario: Toggle via keyboard
- **WHEN** user presses "I" key (when not in text input)
- **THEN** inspector panel visibility toggles

#### Scenario: Default state
- **WHEN** demo loads
- **THEN** inspector panel is hidden by default

### Requirement: Key derivation display

The inspector panel SHALL show the full key derivation chain.

#### Scenario: Channel key display
- **WHEN** inspector is open
- **THEN** channel key is displayed (truncated: "a3f2...b7c1")
- **AND** full key available on hover/click

#### Scenario: Epoch key derivation
- **WHEN** viewing key derivation section
- **THEN** formula is shown: "epoch_key = HKDF(channel_key, beacon, 'stego-epoch')"
- **AND** current epoch key value is displayed

#### Scenario: Threshold derivation
- **WHEN** viewing threshold section
- **THEN** threshold value is shown (e.g., "0.2473")
- **AND** explanation: "Posts with hash < 0.2473 are signals (~25%)"

### Requirement: Post hash analysis

The inspector panel SHALL show hash calculation and threshold comparison for selected posts.

#### Scenario: Select post for analysis
- **WHEN** user clicks a post in the feed
- **THEN** inspector shows detailed hash analysis for that post

#### Scenario: Hash calculation breakdown
- **WHEN** post is selected
- **THEN** inspector shows:
  - Input: "author + content + epoch"
  - Hash: "7a2f3b..." (full SHA-256)
  - Normalized: "0.4782" (as fraction)
  - Threshold: "0.2473"
  - Result: "0.4782 ≥ 0.2473 → COVER"

#### Scenario: Signal post analysis
- **WHEN** a signal post is selected
- **THEN** inspector shows hash < threshold
- **AND** extracted bits with feature breakdown

### Requirement: Feature extraction breakdown

The inspector panel SHALL show detailed feature extraction for any post.

#### Scenario: Feature breakdown display
- **WHEN** viewing a post's features
- **THEN** each feature is shown with:
  - Raw value (e.g., "length: 47 chars")
  - Threshold (e.g., "≥50?")
  - Result (e.g., "NO → bit 0")

#### Scenario: Bit pattern assembly
- **WHEN** all features are extracted
- **THEN** final bit pattern is shown
- **AND** bit positions are labeled (e.g., "b0=length, b1=media, b2=punct")

### Requirement: Message frame state

The inspector panel SHALL show current message frame assembly state.

#### Scenario: Frame structure display
- **WHEN** viewing frame state
- **THEN** frame diagram is shown with byte offsets
- **AND** current fill state is highlighted

#### Scenario: Bit buffer display
- **WHEN** bits are accumulating
- **THEN** raw bit buffer is shown with grouping
- **AND** byte alignment markers are visible

#### Scenario: Error correction state
- **WHEN** Reed-Solomon is applicable
- **THEN** RS state is shown (symbols received, corrections made)

### Requirement: Protocol event log

The inspector panel SHALL maintain a log of protocol events.

#### Scenario: Event logging
- **WHEN** protocol events occur (post classified, bits extracted, epoch change)
- **THEN** events are logged with timestamp and details

#### Scenario: Log filtering
- **WHEN** user selects filter (signals only, errors only, all)
- **THEN** log displays only matching events

#### Scenario: Log export
- **WHEN** user clicks "Export Log"
- **THEN** log is downloaded as JSON file

### Requirement: Dual-view comparison

The inspector panel SHALL illustrate what observers see vs what keyholders see.

#### Scenario: Observer view
- **WHEN** "Observer View" tab is selected
- **THEN** posts appear as normal social media posts
- **AND** no signal/cover indicators are visible

#### Scenario: Keyholder view
- **WHEN** "Keyholder View" tab is selected
- **THEN** signal posts are highlighted
- **AND** extracted bits and message progress are visible

#### Scenario: Side-by-side toggle
- **WHEN** user toggles "Compare Views"
- **THEN** observer and keyholder views are shown side-by-side
- **AND** same posts but different presentation
