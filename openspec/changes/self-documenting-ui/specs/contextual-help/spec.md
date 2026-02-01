## ADDED Requirements

### Requirement: Tooltip component
The system SHALL provide a `<Tooltip>` component that displays explanatory content for UI elements. Each tooltip SHALL have:
- A unique identifier (`TooltipId`)
- Short description text (displayed on first interaction)
- Long description text (displayed on "Learn more" expansion)
- Configurable placement (top, bottom, left, right)

#### Scenario: Tooltip trigger display
- **WHEN** a UI element has an associated tooltip
- **AND** testing mode is inactive
- **THEN** a `(?)` icon SHALL be displayed adjacent to the element

#### Scenario: Tooltip short text on interaction
- **WHEN** user clicks or hovers on a tooltip trigger
- **AND** testing mode is inactive
- **THEN** the short description text SHALL be displayed in a popover

#### Scenario: Tooltip long text expansion
- **WHEN** a tooltip popover is displayed
- **AND** user clicks "Learn more"
- **THEN** the long description text SHALL replace the short text

#### Scenario: Testing mode inline display
- **WHEN** testing mode is active
- **THEN** tooltip long text SHALL be displayed inline without requiring interaction

### Requirement: Tooltip content registry
The system SHALL maintain a centralized registry of tooltip content keyed by `TooltipId`. The registry SHALL be structured for future internationalization support.

#### Scenario: Registry lookup
- **WHEN** a `<Tooltip>` component renders with a given `id`
- **THEN** it SHALL retrieve content from the registry using that id

#### Scenario: Missing tooltip graceful handling
- **WHEN** a tooltip id is not found in the registry
- **THEN** the component SHALL render without a tooltip (no error thrown)

### Requirement: Standard tooltip definitions
The system SHALL define tooltips for the following UI concepts:

| Tooltip ID | Short Text | Context |
|------------|------------|---------|
| `signal-post` | "This post carries message data" | Post list items |
| `cover-post` | "This post provides cover traffic" | Post list items |
| `feature-bits` | "3 bits encoded by post characteristics" | Feature analysis |
| `epoch` | "Time period for key derivation" | Status bar |
| `beacon` | "Public randomness source" | Channel settings |
| `threshold` | "Selection probability (~25%)" | Activity log |

#### Scenario: Signal post tooltip content
- **WHEN** user views tooltip for a signal post indicator
- **THEN** short text SHALL explain that the post carries message data
- **AND** long text SHALL explain the hash-based selection mechanism

#### Scenario: Feature bits tooltip content
- **WHEN** user views tooltip for feature bits display
- **THEN** short text SHALL state "3 bits encoded by post characteristics"
- **AND** long text SHALL explain length, media, and first-character encoding rules

### Requirement: Tooltip accessibility
Tooltips SHALL be accessible to keyboard and screen reader users.

#### Scenario: Keyboard activation
- **WHEN** user focuses a tooltip trigger via keyboard (Tab)
- **AND** presses Enter or Space
- **THEN** the tooltip popover SHALL appear

#### Scenario: Screen reader announcement
- **WHEN** a tooltip popover appears
- **THEN** the content SHALL be announced to screen readers via appropriate ARIA attributes

#### Scenario: Escape dismissal
- **WHEN** a tooltip popover is open
- **AND** user presses Escape
- **THEN** the popover SHALL close and focus SHALL return to the trigger
