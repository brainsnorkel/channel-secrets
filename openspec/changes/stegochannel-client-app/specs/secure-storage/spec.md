## ADDED Requirements

### Requirement: Passphrase-based encryption
The system SHALL encrypt all sensitive local storage using a user-provided passphrase.

#### Scenario: Initial passphrase setup
- **WHEN** user first uses the application
- **THEN** system SHALL require setting a passphrase before storing any keys

#### Scenario: Passphrase unlock
- **WHEN** user opens the application
- **THEN** system SHALL require passphrase to decrypt stored data

#### Scenario: Key derivation from passphrase
- **WHEN** deriving encryption key from passphrase
- **THEN** system SHALL use Argon2id with secure parameters (memory: 64MB, iterations: 3, parallelism: 4)

### Requirement: Channel key storage
The system SHALL securely store channel keys encrypted with the passphrase-derived key.

#### Scenario: Store channel key
- **WHEN** user creates or imports a channel
- **THEN** system SHALL encrypt the key with AES-256-GCM and store in IndexedDB

#### Scenario: Retrieve channel key
- **WHEN** application needs a channel key
- **THEN** system SHALL decrypt from storage using passphrase-derived key

### Requirement: Message history storage
The system SHALL store received message history in encrypted form.

#### Scenario: Store received message
- **WHEN** message is successfully decoded
- **THEN** system SHALL encrypt and store message with metadata

#### Scenario: Message metadata
- **WHEN** storing message
- **THEN** system SHALL include: timestamp, channel ID, sender sources, bit count, auth status

### Requirement: Transmission state storage
The system SHALL persist transmission state to survive application restarts.

#### Scenario: Persist transmission progress
- **WHEN** user has active message transmission
- **THEN** system SHALL store: message content, bits sent, draft buffer, source usage

#### Scenario: Resume transmission
- **WHEN** application restarts with pending transmission
- **THEN** system SHALL restore state and allow continuation

### Requirement: Credential storage
The system SHALL securely store platform credentials (Bluesky app passwords).

#### Scenario: Store app password
- **WHEN** user authenticates with Bluesky
- **THEN** system SHALL encrypt and store credentials separately from channel keys

#### Scenario: Credential isolation
- **WHEN** storing credentials
- **THEN** system SHALL use separate encryption keys per credential to limit exposure

### Requirement: Data export
The system SHALL support exporting all user data in encrypted format.

#### Scenario: Export backup
- **WHEN** user requests data export
- **THEN** system SHALL create encrypted archive containing all channels, messages, and settings

#### Scenario: Export format
- **WHEN** exporting data
- **THEN** system SHALL use documented format that can be imported on another device

### Requirement: Data import
The system SHALL support importing data from encrypted backup files.

#### Scenario: Import backup
- **WHEN** user provides backup file and passphrase
- **THEN** system SHALL decrypt and merge data into local storage

#### Scenario: Conflict resolution
- **WHEN** imported data conflicts with existing data
- **THEN** system SHALL prompt user to choose keep/replace/merge

### Requirement: Data deletion
The system SHALL support secure deletion of stored data.

#### Scenario: Delete channel
- **WHEN** user deletes a channel
- **THEN** system SHALL remove all associated keys, messages, and state

#### Scenario: Delete all data
- **WHEN** user requests full data wipe
- **THEN** system SHALL remove all stored data and require re-setup

### Requirement: Storage quota management
The system SHALL monitor and manage browser storage quotas.

#### Scenario: Quota warning
- **WHEN** storage usage exceeds 80% of quota
- **THEN** system SHALL warn user and suggest archiving old messages

#### Scenario: Auto-pruning
- **WHEN** storage quota is nearly exhausted
- **THEN** system SHALL offer to prune oldest messages (with confirmation)

### Requirement: Memory protection
The system SHALL minimize exposure of sensitive data in memory.

#### Scenario: Clear sensitive data
- **WHEN** user locks application or navigates away
- **THEN** system SHALL clear decrypted keys from memory

#### Scenario: Avoid logging secrets
- **WHEN** logging for debugging
- **THEN** system SHALL never log channel keys, passphrases, or decrypted messages
