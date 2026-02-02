# Mock Beacon

Simulated beacon system providing deterministic, accelerated, or manual epoch control.

## ADDED Requirements

### Requirement: Beacon mode selection

The mock beacon SHALL support three operating modes: fixed seed, accelerated, and manual.

#### Scenario: Fixed seed mode
- **WHEN** user selects fixed seed mode and enters seed "demo123"
- **THEN** beacon values are deterministically derived from the seed
- **AND** the sequence is reproducible across page reloads with same seed

#### Scenario: Accelerated mode
- **WHEN** user selects accelerated mode with 60x speed
- **THEN** epochs advance every 1 second (simulating 1-minute real epochs)
- **AND** a timer display shows time until next epoch

#### Scenario: Manual mode
- **WHEN** user selects manual mode
- **THEN** epochs only advance when user clicks "Next Epoch" button
- **AND** current epoch number and beacon value are displayed

### Requirement: Epoch key derivation

The mock beacon SHALL derive epoch keys from channel key and beacon value per SPEC.md.

#### Scenario: Key derivation on epoch change
- **WHEN** a new epoch begins (beacon value changes)
- **THEN** epoch_key is derived via HKDF-SHA256(channel_key, beacon_value, "stego-epoch")
- **AND** the new epoch key is used for all signal/cover decisions

#### Scenario: Threshold calculation
- **WHEN** epoch key is derived
- **THEN** signal threshold is calculated as epoch_key interpreted as fraction
- **AND** threshold is displayed in inspector (e.g., "0.2473")

### Requirement: Beacon value display

The mock beacon SHALL display current beacon information in the UI.

#### Scenario: Beacon status display
- **WHEN** viewing the demo header
- **THEN** current epoch number, beacon value (truncated), and mode indicator are visible

#### Scenario: Epoch transition notification
- **WHEN** epoch changes
- **THEN** a brief notification appears indicating new epoch
- **AND** both views update to reflect new epoch key

### Requirement: Deterministic beacon sequence

The mock beacon SHALL produce a deterministic sequence of values from a seed.

#### Scenario: Reproducible sequence
- **WHEN** fixed seed mode is initialized with seed "test"
- **THEN** epoch 1 always produces the same beacon value
- **AND** epoch 2 always produces the same beacon value
- **AND** the sequence matches across different browser sessions

#### Scenario: Seed change resets sequence
- **WHEN** user changes seed from "test" to "demo"
- **THEN** the beacon sequence restarts from epoch 1
- **AND** produces a different deterministic sequence
