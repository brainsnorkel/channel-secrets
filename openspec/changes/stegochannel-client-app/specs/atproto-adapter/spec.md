## ADDED Requirements

### Requirement: Bluesky authentication
The system SHALL support authentication with Bluesky accounts via app password (not main password).

#### Scenario: Login with app password
- **WHEN** user provides handle and app password
- **THEN** system SHALL authenticate and obtain session tokens

#### Scenario: Session refresh
- **WHEN** session token expires
- **THEN** system SHALL automatically refresh using stored credentials

#### Scenario: Reject main password
- **WHEN** user attempts to use main account password
- **THEN** system SHALL warn and recommend creating an app password

### Requirement: Multi-PDS support
The system SHALL support accounts on any ATProto PDS, not just bsky.social.

#### Scenario: Self-hosted PDS
- **WHEN** user's account is on a self-hosted PDS
- **THEN** system SHALL resolve the PDS URL and authenticate correctly

#### Scenario: DID resolution
- **WHEN** fetching posts from a user
- **THEN** system SHALL resolve handle to DID for stable identification

### Requirement: Post fetching
The system SHALL fetch posts from Bluesky accounts configured as receiver sources.

#### Scenario: Fetch author feed
- **WHEN** monitoring a Bluesky account
- **THEN** system SHALL fetch posts via getAuthorFeed API

#### Scenario: Pagination
- **WHEN** more posts exist than returned in single request
- **THEN** system SHALL paginate to fetch complete history within configured window

#### Scenario: Handle deleted posts
- **WHEN** a previously-fetched post is deleted
- **THEN** system SHALL mark it as deleted in local state

### Requirement: Post ID derivation
The system SHALL derive post_id for selection hashing from the AT URI rkey component.

#### Scenario: Extract rkey
- **WHEN** processing post with AT URI `at://did:plc:xxx/app.bsky.feed.post/3jxyz123`
- **THEN** system SHALL use `3jxyz123` as post_id for hashing

### Requirement: Post publishing
The system SHALL support publishing posts to Bluesky for users with authenticated sender sources.

#### Scenario: Publish text post
- **WHEN** user publishes a matching signal post
- **THEN** system SHALL create post via createRecord API

#### Scenario: Publish with media
- **WHEN** user publishes post with image attachment
- **THEN** system SHALL upload blob and include in post record

#### Scenario: Publish with link
- **WHEN** user publishes post with URL
- **THEN** system SHALL include link facet for proper rendering

### Requirement: Rate limiting
The system SHALL respect Bluesky API rate limits and implement appropriate backoff.

#### Scenario: Rate limit hit
- **WHEN** API returns rate limit error
- **THEN** system SHALL wait and retry with exponential backoff

#### Scenario: Polling intervals
- **WHEN** polling for new posts
- **THEN** system SHALL respect minimum intervals to avoid excessive API calls

### Requirement: Feature extraction for Bluesky
The system SHALL extract protocol features from Bluesky post records.

#### Scenario: Extract length
- **WHEN** extracting `len` feature
- **THEN** system SHALL count characters in post text

#### Scenario: Extract media
- **WHEN** extracting `media` feature
- **THEN** system SHALL check for embed images, videos, or external links

#### Scenario: Extract question mark
- **WHEN** extracting `qmark` feature
- **THEN** system SHALL check if post text contains "?"

#### Scenario: Extract first word
- **WHEN** extracting `fword` feature
- **THEN** system SHALL categorize first word as pronoun, article, verb, or other
