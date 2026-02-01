## ADDED Requirements

### Requirement: Feed monitoring
The system SHALL periodically fetch posts from all configured receiver sources (theirSources) for active channels.

#### Scenario: Automatic polling
- **WHEN** application is running with active channels
- **THEN** system SHALL poll receiver sources at configurable intervals (default: 5 minutes)

#### Scenario: Manual refresh
- **WHEN** user triggers manual refresh
- **THEN** system SHALL immediately fetch latest posts from all receiver sources

### Requirement: Signal post detection
The system SHALL identify signal posts by computing selection_hash for each post and comparing against the selection threshold.

#### Scenario: Identify signal post
- **WHEN** a post's selection_value is less than threshold
- **THEN** system SHALL mark the post as a signal post

#### Scenario: Identify cover post
- **WHEN** a post's selection_value is greater than or equal to threshold
- **THEN** system SHALL ignore the post for message extraction

### Requirement: Feature extraction
The system SHALL extract features from signal posts according to the channel's configured feature set (len, media, qmark, fword, wcount).

#### Scenario: Extract standard features
- **WHEN** processing a signal post with feature set [len, media, qmark]
- **THEN** system SHALL extract 3 bits based on post length, media presence, and question mark presence

#### Scenario: Calibrated thresholds
- **WHEN** extracting length-based features
- **THEN** system SHALL use sender-specific calibration data if available, otherwise platform defaults

### Requirement: Bit accumulation
The system SHALL accumulate extracted bits from signal posts in chronological order across all receiver sources.

#### Scenario: Ordered accumulation
- **WHEN** signal posts are received from multiple sources
- **THEN** system SHALL order by timestamp before accumulating bits

#### Scenario: Cross-source deduplication
- **WHEN** identical content appears on multiple sources
- **THEN** system SHALL deduplicate AFTER signal post detection using the algorithm specified below

### Requirement: Deduplication algorithm
The system SHALL deduplicate signal posts from multiple sources to prevent double-counting bits when sender posts to multiple platforms.

#### Scenario: Deduplication key generation
- **WHEN** processing a signal post
- **THEN** system SHALL compute deduplication key as: `SHA256(normalized_text || extracted_bits || timestamp_bucket)`
  - `normalized_text`: Post text after NFC normalization, whitespace collapse, and trim
  - `extracted_bits`: The actual bits extracted from this post (e.g., "011")
  - `timestamp_bucket`: `floor(post_timestamp / 3600)` (1-hour buckets)

#### Scenario: Duplicate detection
- **WHEN** a signal post's deduplication key matches an already-processed post
- **THEN** system SHALL skip this post and NOT accumulate its bits

#### Scenario: Non-duplicate processing
- **WHEN** a signal post's deduplication key is new
- **THEN** system SHALL record the key, accumulate the bits, and mark as processed

#### Scenario: Deduplication timing
- **WHEN** comparing posts across sources
- **THEN** system SHALL perform deduplication AFTER:
  1. Fetching posts from all sources
  2. Classifying each post as signal/cover using selection_hash
  3. Extracting features from signal posts
- **AND** BEFORE accumulating bits to the buffer

#### Scenario: Near-duplicate handling
- **WHEN** posts have similar but not identical content (e.g., cross-post with minor edits)
- **THEN** system SHALL treat them as separate posts (different deduplication keys)

### Requirement: Frame synchronization
The system SHALL continuously attempt to synchronize and decode message frames from the accumulated bit buffer.

#### Scenario: Detect valid frame
- **WHEN** accumulated bits form a valid frame (version, flags, length, payload, auth tag)
- **THEN** system SHALL attempt to decode and verify the message

#### Scenario: Sliding window sync
- **WHEN** frame sync fails at current position
- **THEN** system SHALL continue attempting sync at subsequent bit positions

### Requirement: Message authentication
The system SHALL verify the HMAC-SHA256 auth tag (truncated to 64 bits) for each decoded message.

#### Scenario: Valid authentication
- **WHEN** auth tag matches computed value
- **THEN** system SHALL mark message as authentic and display to user

#### Scenario: Invalid authentication
- **WHEN** auth tag does not match
- **THEN** system SHALL reject the message and optionally warn user of potential corruption

### Requirement: Message decryption
The system SHALL decrypt messages that have the encrypted flag set using XChaCha20-Poly1305.

#### Scenario: Decrypt encrypted message
- **WHEN** message has encrypted flag and valid auth
- **THEN** system SHALL decrypt using epoch key and display plaintext

### Requirement: Message notification
The system SHALL notify users when new messages are successfully decoded.

#### Scenario: Desktop notification
- **WHEN** message is decoded and verified
- **THEN** system SHALL display notification (if enabled) with generic text to preserve stealth

#### Scenario: In-app indicator
- **WHEN** message is decoded
- **THEN** system SHALL update UI to show new message count

### Requirement: Message history
The system SHALL store decoded messages with metadata (timestamp, sender source, bit count).

#### Scenario: View message history
- **WHEN** user opens message history for a channel
- **THEN** system SHALL display all received messages in chronological order

### Requirement: Historical recovery
The system SHALL support scanning historical posts to recover messages sent before monitoring began.

#### Scenario: Scan historical posts
- **WHEN** user requests historical scan with date range
- **THEN** system SHALL fetch and process posts from specified period
