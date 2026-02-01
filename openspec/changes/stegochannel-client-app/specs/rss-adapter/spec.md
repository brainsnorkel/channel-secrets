## ADDED Requirements

### Requirement: RSS feed reading
The system SHALL fetch and parse RSS 2.0 and Atom feeds for receiver sources.

#### Scenario: Parse RSS 2.0 feed
- **WHEN** fetching an RSS 2.0 feed
- **THEN** system SHALL extract items with guid, link, title, description, and pubDate

#### Scenario: Parse Atom feed
- **WHEN** fetching an Atom feed
- **THEN** system SHALL extract entries with id, link, title, content, and updated

#### Scenario: Handle feed errors
- **WHEN** feed fetch fails or returns invalid XML
- **THEN** system SHALL log error and retry on next polling cycle

### Requirement: Post ID derivation for RSS
The system SHALL derive post_id from RSS item identifiers for selection hashing.

#### Scenario: Use GUID when present
- **WHEN** RSS item has `<guid>` element
- **THEN** system SHALL use the guid value as post_id

#### Scenario: Hash link when no GUID
- **WHEN** RSS item lacks `<guid>` element
- **THEN** system SHALL use SHA-256 hash of `<link>` URL as post_id

#### Scenario: Atom entry ID
- **WHEN** processing Atom entry
- **THEN** system SHALL use `<id>` element as post_id

### Requirement: Feature extraction for RSS
The system SHALL extract protocol features from RSS/Atom content.

#### Scenario: Extract length from description
- **WHEN** extracting `len` feature from RSS item
- **THEN** system SHALL count characters in description/content after stripping HTML

#### Scenario: Extract media from enclosures
- **WHEN** extracting `media` feature
- **THEN** system SHALL check for `<enclosure>` elements or embedded images

#### Scenario: Extract text features
- **WHEN** extracting `qmark` and `fword` features
- **THEN** system SHALL analyze the plain text content

### Requirement: RSS composition assistance
The system SHALL provide composition assistance for users sending via blog posts.

#### Scenario: Show feature requirements
- **WHEN** user is composing a blog post for sending
- **THEN** system SHALL show required features and current draft analysis

#### Scenario: Preview as RSS item
- **WHEN** user drafts blog post content
- **THEN** system SHALL preview how it will appear as an RSS item for feature extraction

### Requirement: Manual publication confirmation
The system SHALL support confirming blog posts that were published manually outside the app.

#### Scenario: Confirm by URL
- **WHEN** user provides published post URL
- **THEN** system SHALL verify the post exists in the RSS feed

#### Scenario: Confirm by feed refresh
- **WHEN** user indicates they published
- **THEN** system SHALL refresh feed and identify the new item

#### Scenario: Match confirmation to draft
- **WHEN** confirming publication
- **THEN** system SHALL verify content matches what was drafted (within tolerance)

### Requirement: Feed polling
The system SHALL poll RSS feeds at configurable intervals for new posts.

#### Scenario: Regular polling
- **WHEN** feed is configured as receiver source
- **THEN** system SHALL poll at configured interval (default: 15 minutes)

#### Scenario: ETag/Last-Modified support
- **WHEN** feed server supports conditional requests
- **THEN** system SHALL use ETag/Last-Modified headers to reduce bandwidth

### Requirement: CORS proxy support
The system SHALL support optional CORS proxy configuration for feeds that don't allow cross-origin requests.

#### Scenario: Direct fetch when allowed
- **WHEN** feed allows CORS
- **THEN** system SHALL fetch directly from browser

#### Scenario: Proxy fallback
- **WHEN** direct fetch fails due to CORS
- **THEN** system SHALL offer to use configured CORS proxy

### Requirement: Feed discovery
The system SHALL support discovering RSS feeds from website URLs.

#### Scenario: Auto-discover feed
- **WHEN** user enters a website URL instead of feed URL
- **THEN** system SHALL check for `<link rel="alternate" type="application/rss+xml">` in HTML
