## ADDED Requirements

### Requirement: Message queuing
The system SHALL allow users to queue a message for transmission on a specific channel.

#### Scenario: Queue new message
- **WHEN** user enters message text and selects a channel
- **THEN** system SHALL encode message frame and calculate required bit sequence

#### Scenario: Show transmission estimate
- **WHEN** message is queued
- **THEN** system SHALL display estimated post count based on selection rate and bits per post

### Requirement: Post composition assistant
The system SHALL provide real-time feedback on post drafts, showing whether they match required message bits.

#### Scenario: Analyze draft post
- **WHEN** user types a post draft
- **THEN** system SHALL show: signal/cover status, extracted features, required bits, and match status

#### Scenario: Signal post match
- **WHEN** draft is a signal post matching required bits
- **THEN** system SHALL indicate "MATCH - ready to publish"

#### Scenario: Signal post mismatch
- **WHEN** draft is a signal post not matching required bits
- **THEN** system SHALL indicate "NO MATCH" and show what bits it would provide

#### Scenario: Cover post indication
- **WHEN** draft is a cover post (not selected as signal)
- **THEN** system SHALL indicate "COVER - publish freely"

### Requirement: Feature guidance
The system SHALL provide hints about what features would produce a matching post without dictating specific content.

#### Scenario: Show required features
- **WHEN** user is composing and needs a specific bit pattern
- **THEN** system SHALL show hints like "needs: shorter post, with media, no question mark"

### Requirement: Multi-source publishing
The system SHALL track which sender sources (mySources) have been used for each signal post, supporting redundant publishing.

#### Scenario: Publish to primary source
- **WHEN** user publishes matching signal post to Bluesky
- **THEN** system SHALL record the post and advance message progress

#### Scenario: Publish to additional sources
- **WHEN** user publishes same content to additional sources (e.g., blog)
- **THEN** system SHALL record for redundancy without double-counting bits

### Requirement: Transmission progress tracking
The system SHALL display progress of message transmission: bits sent, bits remaining, percentage complete.

#### Scenario: View progress
- **WHEN** user has an active transmission
- **THEN** system SHALL show "24/88 bits sent (27%)" or similar

#### Scenario: Completion notification
- **WHEN** all message bits have been sent
- **THEN** system SHALL notify user that transmission is complete

### Requirement: Draft buffer management
The system SHALL allow saving non-matching signal posts to a draft buffer for later use.

#### Scenario: Save to draft buffer
- **WHEN** user composes a signal post that doesn't match current requirements
- **THEN** system SHALL offer to save it to the draft buffer

#### Scenario: Check draft buffer
- **WHEN** required bits change (after publishing other posts)
- **THEN** system SHALL check if any buffered drafts now match

#### Scenario: Use buffered draft
- **WHEN** a buffered draft matches current requirements
- **THEN** system SHALL notify user and offer to use it

### Requirement: Message cancellation
The system SHALL allow users to cancel an in-progress message transmission.

#### Scenario: Cancel transmission
- **WHEN** user cancels a partially-sent message
- **THEN** system SHALL clear transmission state and discard remaining bits

#### Scenario: Warn about partial transmission
- **WHEN** user cancels after some bits have been sent
- **THEN** system SHALL warn that receiver may see corrupted partial message

### Requirement: Confirm publication
The system SHALL require confirmation that a post was actually published before advancing transmission state.

#### Scenario: Confirm Bluesky post
- **WHEN** user publishes via integrated Bluesky posting
- **THEN** system SHALL automatically confirm upon successful API response

#### Scenario: Confirm manual blog post
- **WHEN** user manually posts to blog
- **THEN** system SHALL require user to provide published URL for verification

### Requirement: Publication verification
The system SHALL verify that confirmed posts actually exist on the platform.

#### Scenario: Verify blog post via RSS
- **WHEN** user confirms manual blog publication
- **THEN** system SHALL fetch RSS feed and verify post exists with matching content
