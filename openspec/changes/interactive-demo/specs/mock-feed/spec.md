# Mock Feed

In-memory social network simulation providing post storage, timeline rendering, and cross-view synchronization.

## ADDED Requirements

### Requirement: In-memory post storage

The mock feed SHALL store all posts in memory as an ordered array with metadata.

#### Scenario: Post structure
- **WHEN** a post is added to the feed
- **THEN** it contains: id (unique), author, content, timestamp, hasMedia flag, and epoch reference

#### Scenario: Post ordering
- **WHEN** posts are retrieved for display
- **THEN** they are ordered by timestamp descending (newest first)

### Requirement: Post creation from sender

The mock feed SHALL accept new posts from the sender view and add them to the shared timeline.

#### Scenario: Publishing a post
- **WHEN** sender publishes a post with content "Hello world"
- **THEN** the post is added to the feed with current timestamp
- **AND** a unique post ID is generated
- **AND** the post appears in both sender and receiver views

#### Scenario: Post with media flag
- **WHEN** sender publishes a post and checks "has media"
- **THEN** the post's hasMedia property is set to true
- **AND** a media indicator icon appears on the post

### Requirement: Timeline rendering

The mock feed SHALL render posts as a scrollable timeline with consistent styling.

#### Scenario: Timeline display
- **WHEN** the timeline contains posts
- **THEN** each post displays: author avatar, author name, content, relative timestamp, and media indicator if applicable

#### Scenario: Empty timeline
- **WHEN** the timeline contains no posts
- **THEN** a placeholder message "No posts yet" is displayed

#### Scenario: New post animation
- **WHEN** a new post is added to the feed
- **THEN** it appears at the top with a brief highlight animation

### Requirement: Cross-view synchronization

The mock feed SHALL ensure both sender and receiver views see the same posts.

#### Scenario: Immediate visibility
- **WHEN** sender publishes a post
- **THEN** the receiver view displays the post within 100ms

#### Scenario: Consistent state
- **WHEN** viewing the timeline from sender or receiver perspective
- **THEN** the same posts appear in the same order

### Requirement: Post metadata for protocol

The mock feed SHALL compute and store protocol-relevant metadata for each post.

#### Scenario: Hash computation
- **WHEN** a post is created
- **THEN** its deterministic hash is computed from (author + content + epoch)
- **AND** stored as post.hash

#### Scenario: Feature extraction storage
- **WHEN** a post is created
- **THEN** its extracted features (length bucket, media bit, punctuation bit) are computed
- **AND** stored as post.features for inspector display
