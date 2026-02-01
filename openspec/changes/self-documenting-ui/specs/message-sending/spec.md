## MODIFIED Requirements

### Requirement: Post composition assistant
The system SHALL provide real-time feedback on post drafts, showing whether they match required message bits. The assistant SHALL include detailed explanations of why features encode specific bits.

#### Scenario: Analyze draft post
- **WHEN** user types a post draft
- **THEN** system SHALL show: signal/cover status, extracted features, required bits, and match status

#### Scenario: Signal post match
- **WHEN** draft is a signal post matching required bits
- **THEN** system SHALL indicate "MATCH - ready to publish"

#### Scenario: Signal post mismatch
- **WHEN** draft is a signal post not matching required bits
- **THEN** system SHALL indicate "NO MATCH" and show what bits it would provide

#### Scenario: Cover post indication
- **WHEN** draft is a cover post (not selected as signal)
- **THEN** system SHALL indicate "COVER - publish freely"

#### Scenario: Feature breakdown display
- **WHEN** user is composing a post
- **THEN** system SHALL display individual feature analysis:
  - Length: character count and threshold comparison (e.g., "42 chars → 0 (need ≥100 for 1)")
  - Media: attachment status (e.g., "none → 0")
  - First character: classification (e.g., "'J' (letter) → 1")
  - Combined encoding (e.g., "Encodes: 0b001")

#### Scenario: Feature explanation tooltips
- **WHEN** user hovers/clicks on a feature in the breakdown
- **THEN** system SHALL display explanation of how that feature maps to bits per SPEC.md §8.2

#### Scenario: Testing mode feature display
- **WHEN** testing mode is active
- **THEN** feature breakdown SHALL be expanded by default with full explanations visible

### Requirement: Feature guidance
The system SHALL provide hints about what features would produce a matching post without dictating specific content. Hints SHALL include specific actionable suggestions.

#### Scenario: Show required features
- **WHEN** user is composing and needs a specific bit pattern
- **THEN** system SHALL show hints like "needs: shorter post, with media, no question mark"

#### Scenario: Smart tips with specifics
- **WHEN** a post doesn't match required bits
- **THEN** system SHALL calculate and display minimal changes needed (e.g., "Add 58+ characters to match" not just "make it longer")

#### Scenario: Multiple path suggestions
- **WHEN** multiple feature changes could produce a match
- **THEN** system SHALL show all options (e.g., "Either: add image OR add 60 chars")

## ADDED Requirements

### Requirement: Composition assistant panel visibility
The feature analysis panel in the composition view SHALL respect testing mode settings.

#### Scenario: Production mode collapsed
- **WHEN** testing mode is inactive
- **AND** user is composing a post
- **THEN** feature analysis panel SHALL be collapsed by default

#### Scenario: Production mode expansion triggers
- **WHEN** testing mode is inactive
- **AND** the compose field receives focus OR a signal post is detected
- **THEN** feature analysis panel SHALL expand

#### Scenario: Testing mode always expanded
- **WHEN** testing mode is active
- **THEN** feature analysis panel SHALL always be expanded with full details

### Requirement: SPEC reference in testing mode
When testing mode is active, the composition assistant SHALL display SPEC.md section references for feature encoding rules.

#### Scenario: SPEC reference display
- **WHEN** testing mode is active
- **AND** feature breakdown is displayed
- **THEN** a reference to "SPEC.md §8.2" SHALL be shown for the feature encoding rules
