## ADDED Requirements

### Requirement: Channel creation
The system SHALL allow users to create new channels by generating a cryptographically secure channel key with configurable beacon type, selection rate, and feature set.

#### Scenario: Generate new channel
- **WHEN** user requests new channel creation
- **THEN** system SHALL generate a 256-bit random key and format as stegochannel URI

#### Scenario: Configure channel parameters
- **WHEN** user creates a channel
- **THEN** system SHALL allow selection of beacon (btc, nist, date), selection rate (0.10-0.50), and feature set

### Requirement: Channel import
The system SHALL allow users to import channels via stegochannel URI format: `stegochannel:v0:<base64url(key)>:<beacon_id>:<selection_rate>:<feature_set>`

#### Scenario: Import valid channel URI
- **WHEN** user pastes a valid stegochannel URI
- **THEN** system SHALL parse and store the channel configuration

#### Scenario: Reject invalid channel URI
- **WHEN** user pastes an invalid or malformed URI
- **THEN** system SHALL display a clear error message

### Requirement: Channel export
The system SHALL allow users to export channel configurations as stegochannel URIs for sharing with communication partners.

#### Scenario: Export channel
- **WHEN** user requests channel export
- **THEN** system SHALL display the full stegochannel URI for copying

### Requirement: Multi-source channel configuration
The system SHALL support configuring multiple sender sources (mySources) and receiver sources (theirSources) per channel, allowing posts across multiple platforms.

#### Scenario: Configure sender sources
- **WHEN** user configures a channel
- **THEN** system SHALL allow adding multiple platforms (Bluesky accounts, RSS feeds) as sender sources

#### Scenario: Configure receiver sources
- **WHEN** user configures a channel
- **THEN** system SHALL allow adding multiple platforms as receiver sources to monitor

### Requirement: Source redundancy support
The system SHALL support posting the same message across multiple sender sources for redundancy.

#### Scenario: Multi-platform sending
- **WHEN** user has multiple sender sources configured
- **THEN** system SHALL track which sources have been used for each signal bit

#### Scenario: Deduplication on receive
- **WHEN** receiver detects identical content across multiple sources
- **THEN** system SHALL deduplicate by content hash before accumulating bits

### Requirement: Channel listing
The system SHALL display all configured channels with their partner identifiers and status.

#### Scenario: View channels
- **WHEN** user opens channel management
- **THEN** system SHALL show all channels with names, source counts, and message status

### Requirement: Channel deletion
The system SHALL allow users to delete channels, with confirmation for channels containing unsent messages.

#### Scenario: Delete empty channel
- **WHEN** user deletes a channel with no pending messages
- **THEN** system SHALL remove the channel immediately

#### Scenario: Delete channel with pending messages
- **WHEN** user deletes a channel with unsent messages
- **THEN** system SHALL warn and require confirmation before deletion

### Requirement: Channel naming
The system SHALL allow users to assign friendly names to channels for easy identification.

#### Scenario: Name a channel
- **WHEN** user creates or edits a channel
- **THEN** system SHALL allow setting a display name (e.g., "Alice - Work")
