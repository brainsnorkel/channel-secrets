// Module: adapters/rss
// RSS/Atom feed adapter

import { sha256, stringToBytes, bytesToHex } from '../../core/crypto';

/**
 * Represents a parsed feed item from RSS or Atom
 */
export interface FeedItem {
  /** Stable identifier for selection hashing */
  id: string;
  /** Item title */
  title: string;
  /** Plain text content (HTML stripped) */
  text: string;
  /** Item link/URL */
  link: string;
  /** Publication date */
  pubDate: Date;
  /** Whether item contains media (enclosures, images) */
  hasMedia: boolean;
  /** Original GUID/ID value from feed */
  guid?: string;
}

/**
 * Result of fetching a feed with caching metadata
 */
export interface FeedResult {
  /** Parsed feed items */
  items: FeedItem[];
  /** ETag header value for conditional requests */
  etag?: string;
  /** Last-Modified header value for conditional requests */
  lastModified?: string;
}

/**
 * Options for fetching feeds
 */
export interface FetchOptions {
  /** ETag from previous fetch for conditional GET */
  etag?: string;
  /** Last-Modified from previous fetch for conditional GET */
  lastModified?: string;
  /** Optional CORS proxy URL (appends feed URL as query param) */
  proxyUrl?: string;
}

/**
 * Feed type detection result
 */
export type FeedType = 'rss2' | 'atom' | 'unknown';

/**
 * RSS/Atom feed adapter for StegoChannel
 * Implements feed fetching, parsing, and feature extraction
 */
export class RSSAdapter {
  private parser: DOMParser;

  constructor() {
    this.parser = new DOMParser();
  }

  /**
   * Detect feed type from XML content
   *
   * @param xml - XML string to analyze
   * @returns Feed type: 'rss2', 'atom', or 'unknown'
   */
  detectFeedType(xml: string): FeedType {
    try {
      const doc = this.parser.parseFromString(xml, 'text/xml');

      // Check for parser errors
      const parserError = doc.querySelector('parsererror');
      if (parserError) {
        return 'unknown';
      }

      const rootElement = doc.documentElement;

      // Check for Atom feed
      if (rootElement.tagName === 'feed' &&
          rootElement.namespaceURI === 'http://www.w3.org/2005/Atom') {
        return 'atom';
      }

      // Check for RSS 2.0
      if (rootElement.tagName === 'rss') {
        const version = rootElement.getAttribute('version');
        if (version === '2.0' || version === '0.92' || version === '0.91') {
          return 'rss2';
        }
      }

      return 'unknown';
    } catch (error) {
      console.error('Error detecting feed type:', error);
      return 'unknown';
    }
  }

  /**
   * Parse RSS 2.0 or Atom feed from XML string
   *
   * @param xmlString - RSS/Atom XML content
   * @returns Array of parsed feed items
   * @throws Error if XML parsing fails or feed format is invalid
   */
  async parseFeed(xmlString: string): Promise<FeedItem[]> {
    const doc = this.parser.parseFromString(xmlString, 'text/xml');

    // Check for parser errors
    const parserError = doc.querySelector('parsererror');
    if (parserError) {
      throw new Error(`XML parsing error: ${parserError.textContent}`);
    }

    const feedType = this.detectFeedType(xmlString);

    if (feedType === 'atom') {
      return this.parseAtomFeed(doc);
    } else if (feedType === 'rss2') {
      return this.parseRSS2Feed(doc);
    } else {
      throw new Error('Unknown or unsupported feed format');
    }
  }

  /**
   * Parse RSS 2.0 feed
   */
  private async parseRSS2Feed(doc: Document): Promise<FeedItem[]> {
    const items: FeedItem[] = [];
    const itemElements = doc.querySelectorAll('item');

    for (const itemEl of Array.from(itemElements)) {
      try {
        const guid = this.getElementText(itemEl, 'guid');
        const link = this.getElementText(itemEl, 'link');
        const title = this.getElementText(itemEl, 'title');
        const description = this.getElementText(itemEl, 'description');
        const pubDateStr = this.getElementText(itemEl, 'pubDate');

        // Extract post ID
        const id = await this.extractPostId({
          guid,
          link,
        });

        // Extract text content
        const text = this.extractText({ description, content: '' });

        // Check for media
        const hasMedia = this.hasMedia(itemEl);

        // Parse publication date
        const pubDate = pubDateStr ? new Date(pubDateStr) : new Date();

        items.push({
          id,
          title,
          text,
          link,
          pubDate,
          hasMedia,
          guid,
        });
      } catch (error) {
        console.warn('Error parsing RSS item:', error);
        // Continue with next item
      }
    }

    return items;
  }

  /**
   * Parse Atom feed
   */
  private async parseAtomFeed(doc: Document): Promise<FeedItem[]> {
    const items: FeedItem[] = [];
    const entryElements = doc.querySelectorAll('entry');

    for (const entryEl of Array.from(entryElements)) {
      try {
        const guid = this.getElementText(entryEl, 'id');
        const linkEl = entryEl.querySelector('link');
        const link = linkEl?.getAttribute('href') || '';
        const title = this.getElementText(entryEl, 'title');
        const content = this.getElementText(entryEl, 'content');
        const summary = this.getElementText(entryEl, 'summary');
        const updatedStr = this.getElementText(entryEl, 'updated');

        // Extract post ID (Atom always has <id>)
        const id = await this.extractPostId({
          guid,
          link,
        });

        // Extract text content (prefer content over summary)
        const text = this.extractText({
          description: summary,
          content
        });

        // Check for media
        const hasMedia = this.hasMedia(entryEl);

        // Parse updated date
        const pubDate = updatedStr ? new Date(updatedStr) : new Date();

        items.push({
          id,
          title,
          text,
          link,
          pubDate,
          hasMedia,
          guid,
        });
      } catch (error) {
        console.warn('Error parsing Atom entry:', error);
        // Continue with next entry
      }
    }

    return items;
  }

  /**
   * Fetch RSS/Atom feed with conditional GET support
   *
   * @param url - Feed URL to fetch
   * @param options - Fetch options (etag, lastModified, proxyUrl)
   * @returns Feed result with items and caching headers
   * @throws Error if fetch fails or feed parsing fails
   */
  async fetchFeed(url: string, options?: FetchOptions): Promise<FeedResult> {
    const fetchUrl = options?.proxyUrl
      ? `${options.proxyUrl}?url=${encodeURIComponent(url)}`
      : url;

    const headers: HeadersInit = {};

    // Add conditional request headers
    if (options?.etag) {
      headers['If-None-Match'] = options.etag;
    }
    if (options?.lastModified) {
      headers['If-Modified-Since'] = options.lastModified;
    }

    try {
      const response = await fetch(fetchUrl, { headers });

      // Handle 304 Not Modified
      if (response.status === 304) {
        return {
          items: [],
          etag: options?.etag,
          lastModified: options?.lastModified,
        };
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const xmlText = await response.text();
      const items = await this.parseFeed(xmlText);

      return {
        items,
        etag: response.headers.get('ETag') || undefined,
        lastModified: response.headers.get('Last-Modified') || undefined,
      };
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('CORS')) {
        throw new Error('CORS error: Feed does not allow cross-origin requests. Configure a CORS proxy.');
      }
      throw error;
    }
  }

  /**
   * Extract stable post ID for selection hashing
   * Per spec: Use GUID if present, otherwise SHA-256 hash of link
   *
   * @param item - Object with guid and link properties
   * @returns Stable post ID string
   */
  async extractPostId(item: { guid?: string; link: string }): Promise<string> {
    // Use GUID if present
    if (item.guid && item.guid.trim()) {
      return item.guid.trim();
    }

    // Otherwise, hash the link
    if (!item.link) {
      throw new Error('Feed item missing both guid and link');
    }

    const linkBytes = stringToBytes(item.link);
    const hashBytes = await sha256(linkBytes);
    return bytesToHex(hashBytes);
  }

  /**
   * Extract plain text from feed item content
   * Strips HTML tags and decodes entities
   *
   * @param item - Object with description and/or content properties
   * @returns Plain text content
   */
  extractText(item: { description?: string; content?: string }): string {
    // Prefer content over description
    const htmlContent = item.content || item.description || '';

    if (!htmlContent) {
      return '';
    }

    // Parse HTML and extract text
    const doc = this.parser.parseFromString(htmlContent, 'text/html');
    const text = doc.body.textContent || '';

    // Normalize whitespace
    return text.trim().replace(/\s+/g, ' ');
  }

  /**
   * Check if feed item contains media
   * Checks for enclosures, media:content, and images in content
   *
   * @param itemEl - DOM element for feed item/entry
   * @returns True if media is present
   */
  hasMedia(itemEl: Element): boolean {
    // Check for RSS <enclosure> tag
    const enclosure = itemEl.querySelector('enclosure');
    if (enclosure) {
      return true;
    }

    // Check for Media RSS namespace (media:content, media:thumbnail)
    const mediaContent = itemEl.querySelector('content, thumbnail');
    if (mediaContent) {
      return true;
    }

    // Check for images in content/description
    const description = this.getElementText(itemEl, 'description');
    const content = this.getElementText(itemEl, 'content');
    const combinedContent = description + content;

    // Simple check for image tags or image URLs
    if (combinedContent.includes('<img') ||
        /<img[^>]+src=["'][^"']+["']/i.test(combinedContent)) {
      return true;
    }

    return false;
  }

  /**
   * Get text content of first matching child element
   */
  private getElementText(parent: Element, tagName: string): string {
    const element = parent.querySelector(tagName);
    return element?.textContent?.trim() || '';
  }
}

// Export singleton instance for convenience
export const rssAdapter = new RSSAdapter();
