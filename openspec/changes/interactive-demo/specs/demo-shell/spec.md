# Demo Shell

Main application shell providing layout, mode control, and shared state management.

## ADDED Requirements

### Requirement: Split-screen layout

The demo SHALL display sender and receiver views side-by-side in a split-screen layout with a collapsible inspector panel.

#### Scenario: Default layout on load
- **WHEN** the demo page loads
- **THEN** the screen displays sender view on the left (50%) and receiver view on the right (50%)
- **AND** the inspector panel is collapsed by default

#### Scenario: Inspector panel toggle
- **WHEN** user clicks the inspector toggle button
- **THEN** the inspector panel expands as an overlay or sidebar
- **AND** both sender and receiver views remain visible

### Requirement: Execution mode control

The demo SHALL support two execution modes: step mode and auto mode.

#### Scenario: Step mode activation
- **WHEN** user selects step mode
- **THEN** protocol execution pauses after each decision point
- **AND** a "Next Step" button becomes active
- **AND** the current decision is highlighted with explanation

#### Scenario: Auto mode activation
- **WHEN** user selects auto mode
- **THEN** protocol execution proceeds continuously
- **AND** a speed slider controls execution rate (0.5x to 4x)

#### Scenario: Mode switching mid-execution
- **WHEN** user switches from auto to step mode during execution
- **THEN** execution pauses at the next decision point
- **AND** current state is preserved

### Requirement: Shared state management

The demo SHALL maintain a single source of truth for all application state accessible to all views.

#### Scenario: State initialization
- **WHEN** the demo initializes
- **THEN** a shared state object is created containing posts array, epoch state, sender state, receiver state, and channel key

#### Scenario: State updates propagate to views
- **WHEN** any component updates the shared state
- **THEN** all views reflecting that state update immediately

### Requirement: Channel key configuration

The demo SHALL allow users to configure the channel key or use a default demo key.

#### Scenario: Default key on load
- **WHEN** the demo loads without user configuration
- **THEN** a deterministic demo key is used
- **AND** the key is displayed in truncated form in the header

#### Scenario: Custom key entry
- **WHEN** user enters a custom key (hex string or passphrase)
- **THEN** the demo derives a channel key from the input
- **AND** all epoch keys and thresholds are recalculated

### Requirement: Reset functionality

The demo SHALL provide a reset button to return to initial state.

#### Scenario: Full reset
- **WHEN** user clicks the reset button
- **THEN** all posts are cleared
- **AND** message progress resets to zero
- **AND** epoch resets to initial value
- **AND** channel key remains unchanged unless explicitly reset
