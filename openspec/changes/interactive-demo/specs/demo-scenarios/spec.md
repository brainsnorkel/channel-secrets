# Demo Scenarios

Pre-built demonstration scenarios with canned messages and deterministic seeds for reproducible walkthroughs.

## ADDED Requirements

### Requirement: Scenario selection

The demo SHALL provide a menu to select from pre-built scenarios.

#### Scenario: Scenario menu display
- **WHEN** user clicks "Load Scenario" button
- **THEN** a list of available scenarios is displayed
- **AND** each shows name, description, and estimated duration

#### Scenario: Scenario loading
- **WHEN** user selects a scenario
- **THEN** demo state is reset
- **AND** scenario configuration is applied (seed, message, pre-populated posts)

### Requirement: Quick demo scenario

A "Quick Demo" scenario SHALL demonstrate basic protocol operation in under 2 minutes.

#### Scenario: Quick demo configuration
- **WHEN** "Quick Demo" scenario is loaded
- **THEN** message is set to "HI" (short, fast to transmit)
- **AND** beacon seed produces favorable threshold (~30%)
- **AND** 3 cover posts are pre-populated

#### Scenario: Quick demo execution
- **WHEN** quick demo runs in auto mode
- **THEN** message transmission completes in ~90 seconds
- **AND** approximately 6-8 total posts are published

### Requirement: Educational walkthrough scenario

An "Educational Walkthrough" scenario SHALL explain each step with annotations.

#### Scenario: Walkthrough mode
- **WHEN** "Educational Walkthrough" is loaded
- **THEN** demo is forced into step mode
- **AND** each step includes explanatory text panel

#### Scenario: Step annotations
- **WHEN** stepping through the walkthrough
- **THEN** each decision point has a "What's happening" explanation
- **AND** key concepts are highlighted (first mention of "signal post", "threshold", etc.)

#### Scenario: Walkthrough completion
- **WHEN** walkthrough completes
- **THEN** summary panel shows protocol concepts covered
- **AND** links to SPEC.md sections for deeper reading

### Requirement: Edge case scenarios

The demo SHALL include scenarios demonstrating edge cases.

#### Scenario: Epoch boundary scenario
- **WHEN** "Epoch Boundary" scenario is loaded
- **THEN** message transmission spans an epoch change
- **AND** demo shows key rederivation and threshold change

#### Scenario: Long message scenario
- **WHEN** "Long Message" scenario is loaded
- **THEN** a multi-frame message is used
- **AND** frame boundaries and MAC verification are demonstrated

#### Scenario: Near-threshold scenario
- **WHEN** "Near Threshold" scenario is loaded
- **THEN** posts with hashes very close to threshold are shown
- **AND** inspector highlights the precision of threshold comparison

### Requirement: Scenario state persistence

Scenario progress SHALL be optionally saved for later continuation.

#### Scenario: Save progress
- **WHEN** user clicks "Save Progress" during a scenario
- **THEN** current state is saved to localStorage
- **AND** confirmation message shows save timestamp

#### Scenario: Resume progress
- **WHEN** user loads a scenario with saved progress
- **THEN** prompt asks "Resume from step 7?" or "Start fresh?"
- **AND** selecting resume restores exact state

#### Scenario: Clear saved progress
- **WHEN** user clicks "Clear Saved Progress"
- **THEN** all saved scenario state is deleted
- **AND** confirmation is shown

### Requirement: Custom scenario creation

The demo SHALL allow users to create custom scenarios.

#### Scenario: Custom scenario form
- **WHEN** user clicks "Create Custom Scenario"
- **THEN** form appears with fields: name, message, seed, description

#### Scenario: Custom scenario save
- **WHEN** user fills form and clicks "Save Scenario"
- **THEN** scenario is saved to localStorage
- **AND** appears in scenario menu

#### Scenario: Custom scenario sharing
- **WHEN** user clicks "Share Scenario"
- **THEN** a URL or JSON blob is generated
- **AND** can be imported on another device/browser

### Requirement: Scenario narration

Scenarios SHALL optionally include audio or text narration.

#### Scenario: Text narration
- **WHEN** scenario has narration enabled
- **THEN** text explanations appear in a narration panel
- **AND** narration advances with scenario steps

#### Scenario: Narration toggle
- **WHEN** user toggles "Show Narration" off
- **THEN** narration panel is hidden
- **AND** scenario continues without narration delays
