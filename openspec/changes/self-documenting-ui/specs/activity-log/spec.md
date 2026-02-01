## ADDED Requirements

### Requirement: Activity log data structure
The system SHALL maintain an in-memory activity log as a ring buffer with maximum 500 entries. Each log entry SHALL contain:
- `timestamp`: Unix timestamp in milliseconds
- `level`: One of `info`, `detail`, or `debug`
- `category`: One of `fetch`, `signal`, `decode`, `encode`, `epoch`, `error`
- `message`: Human-readable summary string
- `technical`: Optional technical details string
- `data`: Optional structured data object for inspection

#### Scenario: Log entry creation
- **WHEN** a loggable event occurs (fetch, signal detection, etc.)
- **THEN** a new LogEntry SHALL be created with appropriate fields

#### Scenario: Ring buffer overflow
- **WHEN** the activity log contains 500 entries
- **AND** a new entry is added
- **THEN** the oldest entry SHALL be discarded

### Requirement: Activity log categories
The system SHALL log events in the following categories:

| Category | Events Logged |
|----------|--------------|
| `fetch` | Feed fetch start, completion, errors |
| `signal` | Signal post detection, threshold comparison |
| `decode` | Bit extraction, message accumulation, completion |
| `encode` | Feature analysis, bit requirements, match status |
| `epoch` | Epoch transitions, beacon fetches |
| `error` | Any errors or warnings |

#### Scenario: Fetch event logging
- **WHEN** the system fetches posts from a source
- **THEN** an `info` level entry with category `fetch` SHALL be logged
- **AND** message SHALL include source identifier and post count

#### Scenario: Signal detection logging
- **WHEN** a post is evaluated for signal selection
- **AND** the post matches the threshold
- **THEN** a `detail` level entry with category `signal` SHALL be logged
- **AND** technical details SHALL include hash value and threshold comparison

#### Scenario: Decode completion logging
- **WHEN** a message is fully decoded
- **THEN** an `info` level entry with category `decode` SHALL be logged
- **AND** message SHALL indicate successful decode
- **AND** technical details SHALL include bit count and error correction status

### Requirement: Activity log display levels
The system SHALL filter displayed log entries based on user preference and testing mode:

| Mode | Default Display | Expandable |
|------|-----------------|------------|
| Production | `info` only | `detail` and `debug` on "Show technical details" |
| Testing | All levels | N/A (always shown) |

#### Scenario: Production mode default display
- **WHEN** testing mode is inactive
- **THEN** only `info` level entries SHALL be displayed by default

#### Scenario: Production mode expansion
- **WHEN** testing mode is inactive
- **AND** user clicks "Show technical details"
- **THEN** `detail` and `debug` level entries SHALL be displayed

#### Scenario: Testing mode full display
- **WHEN** testing mode is active
- **THEN** all log levels SHALL be displayed
- **AND** `debug` entries SHALL be formatted in monospace font

### Requirement: Activity log UI panel
The system SHALL display the activity log in a collapsible panel within the main UI.

#### Scenario: Panel collapsed state
- **WHEN** the activity log panel is collapsed
- **THEN** only a summary line SHALL be visible (e.g., "Activity: 15 events")

#### Scenario: Panel expanded state
- **WHEN** the activity log panel is expanded
- **THEN** log entries SHALL be displayed in reverse chronological order (newest first)

#### Scenario: Entry technical details expansion
- **WHEN** a log entry has `technical` content
- **AND** user clicks on the entry
- **THEN** the technical details SHALL be displayed below the message

### Requirement: Activity log is ephemeral
The activity log SHALL NOT be persisted to IndexedDB. It SHALL exist only in memory for the current session.

#### Scenario: Log cleared on app close
- **WHEN** user closes the app
- **AND** user reopens the app
- **THEN** the activity log SHALL be empty

#### Scenario: Log cleared on page refresh
- **WHEN** user refreshes the page
- **THEN** the activity log SHALL be empty

### Requirement: Activity log category filtering
The system SHALL allow filtering the activity log by category.

#### Scenario: Single category filter
- **WHEN** user selects a category filter (e.g., "signal")
- **THEN** only entries matching that category SHALL be displayed

#### Scenario: Clear filter
- **WHEN** user clears the category filter
- **THEN** all entries (subject to level filtering) SHALL be displayed
