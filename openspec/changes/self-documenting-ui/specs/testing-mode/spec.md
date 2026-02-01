## ADDED Requirements

### Requirement: Testing mode activation
The system SHALL support a testing mode that bypasses stealth UI constraints for development and testing purposes. Testing mode SHALL be activated by any of the following (in precedence order):
1. URL parameter: `?testing=1`
2. Environment variable: `VITE_TESTING_MODE=true`
3. localStorage key: `stego_testing_mode` set to `"true"`

#### Scenario: Activate via URL parameter
- **WHEN** the app is loaded with `?testing=1` in the URL
- **THEN** testing mode SHALL be active for that session

#### Scenario: Activate via environment variable
- **WHEN** the app is built with `VITE_TESTING_MODE=true`
- **THEN** testing mode SHALL be active by default

#### Scenario: Activate via localStorage
- **WHEN** `localStorage.getItem('stego_testing_mode')` returns `"true"`
- **AND** no URL parameter or environment variable overrides it
- **THEN** testing mode SHALL be active

#### Scenario: Precedence order
- **WHEN** URL parameter is `?testing=0`
- **AND** environment variable is `VITE_TESTING_MODE=true`
- **THEN** testing mode SHALL be inactive (URL parameter takes precedence)

### Requirement: Testing mode context provider
The system SHALL expose testing mode state via a React context provider. Components SHALL access testing mode state via `useTestingMode()` hook returning a boolean.

#### Scenario: Context provider availability
- **WHEN** a component calls `useTestingMode()`
- **THEN** it SHALL receive the current testing mode boolean value

#### Scenario: Context updates propagate
- **WHEN** testing mode state changes (e.g., via URL navigation)
- **THEN** all components using `useTestingMode()` SHALL re-render with new value

### Requirement: Testing mode visual differences
When testing mode is active, the system SHALL display UI elements differently than production mode:

| Element | Production Mode | Testing Mode |
|---------|-----------------|--------------|
| Post type labels | Hidden or "Note" | "SIGNAL POST" / "COVER POST" |
| Feature bits | Shown on hover/click | Always visible inline |
| Activity log | Collapsed summary | Expanded with full details |
| Tooltips | Require interaction | Content shown inline |
| Onboarding | Modal flow on first use | Disabled |
| Help section | Hidden in settings | Prominent header link |

#### Scenario: Signal post labeling in testing mode
- **WHEN** testing mode is active
- **AND** a post is identified as a signal post
- **THEN** the post SHALL display "SIGNAL POST" label visibly

#### Scenario: Cover post labeling in testing mode
- **WHEN** testing mode is active
- **AND** a post is identified as a cover post
- **THEN** the post SHALL display "COVER POST" label visibly

#### Scenario: Feature bits always visible
- **WHEN** testing mode is active
- **THEN** feature bit breakdowns SHALL be displayed inline without requiring hover or click
