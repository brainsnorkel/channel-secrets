## ADDED Requirements

### Requirement: Web application platform
The system SHALL be implemented as a TypeScript/React web application using the tosijs ecosystem that runs in modern browsers (Chrome, Firefox, Safari, Edge).

#### Scenario: Browser compatibility
- **WHEN** user opens the application in a supported browser
- **THEN** all features SHALL function without plugins or extensions

#### Scenario: State management
- **WHEN** application state changes
- **THEN** system SHALL use react-tosijs path-based observers for reactive updates

#### Scenario: Runtime validation
- **WHEN** processing channel configurations or message structures
- **THEN** system SHALL validate using tosijs-schema with JSON-serializable schemas

#### Scenario: Mobile browser support
- **WHEN** user opens the application on a mobile browser
- **THEN** the interface SHALL be responsive and usable on touch devices

### Requirement: Client-side cryptography
The system SHALL perform all cryptographic operations (key derivation, encryption, decryption, HMAC) entirely in the browser. No cryptographic keys SHALL be transmitted to any server.

#### Scenario: Key isolation
- **WHEN** user creates or imports a channel key
- **THEN** the key SHALL never leave the browser context

#### Scenario: Offline cryptography
- **WHEN** user composes a message while offline
- **THEN** encryption and feature calculation SHALL still function

### Requirement: Optional desktop wrapper
The system SHALL support packaging as a desktop application via Tauri for users who prefer native installation.

#### Scenario: Desktop build
- **WHEN** developer builds desktop version
- **THEN** application SHALL package as native executable for Windows, macOS, and Linux

### Requirement: No backend dependency
The system SHALL function without any custom backend server. All network requests SHALL be to public APIs (social platforms, beacon sources).

#### Scenario: Serverless operation
- **WHEN** user uses the application
- **THEN** no requests SHALL be made to StegoChannel-specific servers

### Requirement: Modular adapter architecture
The system SHALL use an adapter pattern for platform integrations, allowing new platforms to be added without modifying core logic.

#### Scenario: Platform abstraction
- **WHEN** adding support for a new social platform
- **THEN** only a new adapter module SHALL be required
