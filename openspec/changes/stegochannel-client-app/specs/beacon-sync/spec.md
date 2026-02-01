## ADDED Requirements

### Requirement: Bitcoin beacon fetching
The system SHALL fetch Bitcoin block hashes for the `btc` beacon type.

#### Scenario: Fetch current block hash
- **WHEN** channel uses `btc` beacon
- **THEN** system SHALL fetch latest block hash from blockchain.info or fallback API

#### Scenario: Fallback on API failure
- **WHEN** primary Bitcoin API fails
- **THEN** system SHALL try blockstream.info API as fallback

#### Scenario: Block height tracking
- **WHEN** fetching Bitcoin beacon
- **THEN** system SHALL track block height to detect epoch changes

### Requirement: NIST beacon fetching
The system SHALL fetch randomness values from NIST Randomness Beacon for the `nist` beacon type.

#### Scenario: Fetch current NIST value
- **WHEN** channel uses `nist` beacon
- **THEN** system SHALL fetch current outputValue from beacon.nist.gov API

#### Scenario: Handle NIST outage
- **WHEN** NIST beacon is unavailable
- **THEN** system SHALL use cached last-known value and warn user

### Requirement: Date beacon
The system SHALL support the `date` beacon type using UTC calendar date.

#### Scenario: Compute date beacon
- **WHEN** channel uses `date` beacon
- **THEN** system SHALL use current UTC date in ISO 8601 format (YYYY-MM-DD)

#### Scenario: Timezone handling
- **WHEN** computing date beacon
- **THEN** system SHALL use UTC regardless of user's local timezone

### Requirement: Epoch key derivation
The system SHALL derive epoch keys according to SPEC.md Section 5.

#### Scenario: Derive epoch key
- **WHEN** beacon value is fetched
- **THEN** system SHALL compute `HKDF-Expand(channel_key, beacon_id:beacon_value:stegochannel-v0, 32)`

#### Scenario: Cache epoch keys
- **WHEN** epoch key is derived
- **THEN** system SHALL cache for the epoch duration to avoid redundant derivation

### Requirement: Epoch boundary handling
The system SHALL detect and handle epoch boundary transitions with defined grace periods.

#### Scenario: Epoch transition
- **WHEN** beacon value changes (new block, new minute, new day)
- **THEN** system SHALL derive new epoch key and re-evaluate pending posts

#### Scenario: Transition window with grace period
- **WHEN** processing posts near epoch boundary
- **THEN** system SHALL check multiple epoch keys according to beacon type:
  - `btc`: Current + previous 2 epochs (120 second grace)
  - `nist`: Current + previous epoch (30 second grace)
  - `date`: Current + previous epoch (300 second grace)

#### Scenario: Multi-epoch signal detection
- **WHEN** a post could be a signal post in multiple checked epochs
- **THEN** system SHALL use the first epoch (oldest) that produces a valid selection

#### Scenario: Grace period expiry
- **WHEN** a post timestamp is older than the grace period window
- **THEN** system SHALL only check the epoch corresponding to the post's timestamp

### Requirement: Beacon caching
The system SHALL cache beacon values to reduce API calls and handle temporary outages.

#### Scenario: Cache duration
- **WHEN** beacon is fetched
- **THEN** system SHALL cache for appropriate duration (btc: 1 min, nist: 30 sec, date: until midnight UTC)

#### Scenario: Stale cache warning
- **WHEN** cache is older than expected epoch duration
- **THEN** system SHALL warn user and attempt refresh

### Requirement: Clock synchronization check
The system SHALL verify system clock accuracy for beacon synchronization.

#### Scenario: Clock drift detection
- **WHEN** application starts
- **THEN** system SHALL compare local time against HTTP Date headers from API responses

#### Scenario: Clock drift warning
- **WHEN** detected drift exceeds 30 seconds
- **THEN** system SHALL warn user that message sync may fail

### Requirement: Beacon configuration per channel
The system SHALL support different beacon types per channel.

#### Scenario: Channel-specific beacon
- **WHEN** channel is configured with specific beacon
- **THEN** system SHALL use that beacon type for all operations on that channel

#### Scenario: Beacon in channel URI
- **WHEN** importing channel URI
- **THEN** system SHALL parse and store the beacon_id parameter
