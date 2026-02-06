import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RSSAdapter } from './index';

describe('RSSAdapter', () => {
  let adapter: RSSAdapter;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    adapter = new RSSAdapter();
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('RSS 2.0 Feed Parsing', () => {
    it('parses RSS 2.0 feed correctly', async () => {
      const rss2XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Blog</title>
    <link>https://example.com</link>
    <description>A test blog</description>
    <item>
      <guid>post-123</guid>
      <title>First Post</title>
      <link>https://example.com/post-123</link>
      <description>This is the first post</description>
      <pubDate>Wed, 05 Feb 2026 12:00:00 GMT</pubDate>
    </item>
    <item>
      <guid>post-456</guid>
      <title>Second Post</title>
      <link>https://example.com/post-456</link>
      <description>This is the second post</description>
      <pubDate>Thu, 06 Feb 2026 09:00:00 GMT</pubDate>
      <enclosure url="https://example.com/image.jpg" type="image/jpeg" />
    </item>
  </channel>
</rss>`;

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => rss2XML,
        headers: new Headers({
          'ETag': '"abc123"',
          'Last-Modified': 'Thu, 06 Feb 2026 10:00:00 GMT',
        }),
      });

      const result = await adapter.fetchFeed('https://example.com/feed.xml');

      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toMatchObject({
        id: 'post-123',
        title: 'First Post',
        text: 'This is the first post',
        link: 'https://example.com/post-123',
        hasMedia: false,
        guid: 'post-123',
      });
      expect(result.items[0].pubDate).toBeInstanceOf(Date);
      expect(result.items[1]).toMatchObject({
        id: 'post-456',
        hasMedia: true, // Has enclosure
      });
      expect(result.etag).toBe('"abc123"');
      expect(result.lastModified).toBe('Thu, 06 Feb 2026 10:00:00 GMT');
    });

    it('handles RSS 2.0 items without GUID by hashing link', async () => {
      const rss2XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Blog</title>
    <item>
      <title>No GUID Post</title>
      <link>https://example.com/no-guid</link>
      <description>Post without GUID</description>
      <pubDate>Wed, 05 Feb 2026 12:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => rss2XML,
        headers: new Headers(),
      });

      const result = await adapter.fetchFeed('https://example.com/feed.xml');

      expect(result.items).toHaveLength(1);
      // ID should be a SHA-256 hex hash (64 characters)
      expect(result.items[0].id).toMatch(/^[a-f0-9]{64}$/);
      // guid should be empty string when not present in feed
      expect(result.items[0].guid).toBe('');
    });

    it('detects media in RSS content via img tags', async () => {
      const rss2XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Blog</title>
    <item>
      <guid>post-with-image</guid>
      <title>Post with Image</title>
      <link>https://example.com/post</link>
      <description>&lt;p&gt;Check out this image:&lt;/p&gt;&lt;img src="https://example.com/photo.jpg" /&gt;</description>
      <pubDate>Wed, 05 Feb 2026 12:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => rss2XML,
        headers: new Headers(),
      });

      const result = await adapter.fetchFeed('https://example.com/feed.xml');

      expect(result.items[0].hasMedia).toBe(true);
    });

    it('strips HTML from description and normalizes whitespace', async () => {
      const rss2XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Blog</title>
    <item>
      <guid>html-post</guid>
      <title>HTML Post</title>
      <link>https://example.com/html</link>
      <description>&lt;p&gt;This  has   &lt;strong&gt;HTML&lt;/strong&gt;  tags&lt;/p&gt;</description>
      <pubDate>Wed, 05 Feb 2026 12:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => rss2XML,
        headers: new Headers(),
      });

      const result = await adapter.fetchFeed('https://example.com/feed.xml');

      expect(result.items[0].text).toBe('This has HTML tags');
    });
  });

  describe('Atom Feed Parsing', () => {
    it('parses Atom feed correctly', async () => {
      const atomXML = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Test Atom Feed</title>
  <link href="https://example.com" />
  <updated>2026-02-06T12:00:00Z</updated>
  <entry>
    <id>tag:example.com,2026:entry-1</id>
    <title>First Entry</title>
    <link href="https://example.com/entry-1" />
    <updated>2026-02-05T12:00:00Z</updated>
    <content type="html">&lt;p&gt;This is the content&lt;/p&gt;</content>
    <summary>This is the summary</summary>
  </entry>
  <entry>
    <id>tag:example.com,2026:entry-2</id>
    <title>Second Entry</title>
    <link href="https://example.com/entry-2" />
    <updated>2026-02-06T09:00:00Z</updated>
    <summary>Entry with just summary</summary>
  </entry>
</feed>`;

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => atomXML,
        headers: new Headers({
          'ETag': '"xyz789"',
        }),
      });

      const result = await adapter.fetchFeed('https://example.com/atom.xml');

      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toMatchObject({
        id: 'tag:example.com,2026:entry-1',
        title: 'First Entry',
        text: 'This is the content', // Prefers content over summary
        link: 'https://example.com/entry-1',
        guid: 'tag:example.com,2026:entry-1',
      });
      expect(result.items[1].text).toBe('Entry with just summary');
      expect(result.etag).toBe('"xyz789"');
    });

    it('prefers content over summary in Atom feeds', async () => {
      const atomXML = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Test Feed</title>
  <entry>
    <id>entry-1</id>
    <title>Entry</title>
    <link href="https://example.com/entry" />
    <updated>2026-02-06T12:00:00Z</updated>
    <content>Full content here</content>
    <summary>Just a summary</summary>
  </entry>
</feed>`;

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => atomXML,
        headers: new Headers(),
      });

      const result = await adapter.fetchFeed('https://example.com/atom.xml');

      expect(result.items[0].text).toBe('Full content here');
    });

    it('falls back to summary when content is missing', async () => {
      const atomXML = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Test Feed</title>
  <entry>
    <id>entry-1</id>
    <title>Entry</title>
    <link href="https://example.com/entry" />
    <updated>2026-02-06T12:00:00Z</updated>
    <summary>Only summary available</summary>
  </entry>
</feed>`;

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => atomXML,
        headers: new Headers(),
      });

      const result = await adapter.fetchFeed('https://example.com/atom.xml');

      expect(result.items[0].text).toBe('Only summary available');
    });
  });

  describe('CORS Proxy Fallback', () => {
    it('uses proxy URL when provided', async () => {
      const feedUrl = 'https://example.com/feed.xml';
      const proxyUrl = 'https://cors-proxy.example.com';
      const rss2XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Proxied Feed</title>
    <item>
      <guid>proxy-test</guid>
      <title>Test Post</title>
      <link>https://example.com/post</link>
      <description>Test content</description>
      <pubDate>Wed, 05 Feb 2026 12:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => rss2XML,
        headers: new Headers(),
      });

      await adapter.fetchFeed(feedUrl, { proxyUrl });

      expect(mockFetch).toHaveBeenCalledWith(
        `${proxyUrl}?url=${encodeURIComponent(feedUrl)}`,
        expect.any(Object)
      );
    });

    it('makes direct request when no proxy URL provided', async () => {
      const feedUrl = 'https://example.com/feed.xml';
      const rss2XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel><title>Test</title></channel>
</rss>`;

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => rss2XML,
        headers: new Headers(),
      });

      await adapter.fetchFeed(feedUrl);

      expect(mockFetch).toHaveBeenCalledWith(feedUrl, expect.any(Object));
    });

    it('throws helpful error on CORS failure', async () => {
      mockFetch.mockRejectedValue(
        new TypeError('Failed to fetch: CORS policy blocked')
      );

      await expect(
        adapter.fetchFeed('https://example.com/feed.xml')
      ).rejects.toThrow(
        'CORS error: Feed does not allow cross-origin requests. Configure a CORS proxy.'
      );
    });
  });

  describe('Conditional GET (304 Not Modified)', () => {
    it('sends If-None-Match header with ETag', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 304,
        headers: new Headers(),
      });

      const result = await adapter.fetchFeed('https://example.com/feed.xml', {
        etag: '"cached-etag"',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/feed.xml',
        {
          headers: {
            'If-None-Match': '"cached-etag"',
          },
        }
      );
      expect(result.items).toEqual([]);
      expect(result.etag).toBe('"cached-etag"');
    });

    it('sends If-Modified-Since header with lastModified', async () => {
      const lastModified = 'Thu, 05 Feb 2026 12:00:00 GMT';

      mockFetch.mockResolvedValue({
        ok: true,
        status: 304,
        headers: new Headers(),
      });

      const result = await adapter.fetchFeed('https://example.com/feed.xml', {
        lastModified,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/feed.xml',
        {
          headers: {
            'If-Modified-Since': lastModified,
          },
        }
      );
      expect(result.items).toEqual([]);
      expect(result.lastModified).toBe(lastModified);
    });

    it('sends both conditional headers when provided', async () => {
      const etag = '"etag-123"';
      const lastModified = 'Thu, 05 Feb 2026 12:00:00 GMT';

      mockFetch.mockResolvedValue({
        ok: true,
        status: 304,
        headers: new Headers(),
      });

      await adapter.fetchFeed('https://example.com/feed.xml', {
        etag,
        lastModified,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/feed.xml',
        {
          headers: {
            'If-None-Match': etag,
            'If-Modified-Since': lastModified,
          },
        }
      );
    });

    it('returns empty items array on 304 response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 304,
        headers: new Headers(),
      });

      const result = await adapter.fetchFeed('https://example.com/feed.xml', {
        etag: '"cached"',
      });

      expect(result.items).toEqual([]);
    });
  });

  describe('Media Detection', () => {
    it('detects enclosure as media', async () => {
      const rss2XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test</title>
    <item>
      <guid>enclosure-test</guid>
      <title>Post</title>
      <link>https://example.com/post</link>
      <description>Content</description>
      <pubDate>Wed, 05 Feb 2026 12:00:00 GMT</pubDate>
      <enclosure url="https://example.com/audio.mp3" type="audio/mpeg" length="12345" />
    </item>
  </channel>
</rss>`;

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => rss2XML,
        headers: new Headers(),
      });

      const result = await adapter.fetchFeed('https://example.com/feed.xml');

      expect(result.items[0].hasMedia).toBe(true);
    });

    it('detects Media RSS content element', async () => {
      const rss2XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>Test</title>
    <item>
      <guid>media-test</guid>
      <title>Post</title>
      <link>https://example.com/post</link>
      <description>Content</description>
      <pubDate>Wed, 05 Feb 2026 12:00:00 GMT</pubDate>
      <media:content url="https://example.com/video.mp4" type="video/mp4" />
    </item>
  </channel>
</rss>`;

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => rss2XML,
        headers: new Headers(),
      });

      const result = await adapter.fetchFeed('https://example.com/feed.xml');

      expect(result.items[0].hasMedia).toBe(true);
    });

    it('detects Media RSS thumbnail element', async () => {
      const rss2XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>Test</title>
    <item>
      <guid>thumbnail-test</guid>
      <title>Post</title>
      <link>https://example.com/post</link>
      <description>Content</description>
      <pubDate>Wed, 05 Feb 2026 12:00:00 GMT</pubDate>
      <media:thumbnail url="https://example.com/thumb.jpg" />
    </item>
  </channel>
</rss>`;

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => rss2XML,
        headers: new Headers(),
      });

      const result = await adapter.fetchFeed('https://example.com/feed.xml');

      expect(result.items[0].hasMedia).toBe(true);
    });

    it('detects images in HTML content', async () => {
      const rss2XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test</title>
    <item>
      <guid>image-in-content</guid>
      <title>Post</title>
      <link>https://example.com/post</link>
      <description>&lt;p&gt;Here is an image:&lt;/p&gt;&lt;img src="photo.jpg" alt="Photo" /&gt;</description>
      <pubDate>Wed, 05 Feb 2026 12:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => rss2XML,
        headers: new Headers(),
      });

      const result = await adapter.fetchFeed('https://example.com/feed.xml');

      expect(result.items[0].hasMedia).toBe(true);
    });

    it('returns false when no media present', async () => {
      const rss2XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test</title>
    <item>
      <guid>no-media</guid>
      <title>Text Only Post</title>
      <link>https://example.com/post</link>
      <description>Just plain text content</description>
      <pubDate>Wed, 05 Feb 2026 12:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => rss2XML,
        headers: new Headers(),
      });

      const result = await adapter.fetchFeed('https://example.com/feed.xml');

      expect(result.items[0].hasMedia).toBe(false);
    });
  });

  describe('Network Error Handling', () => {
    it('throws error on HTTP error status', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(
        adapter.fetchFeed('https://example.com/feed.xml')
      ).rejects.toThrow('HTTP 404: Not Found');
    });

    it('throws error on network failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network request failed'));

      await expect(
        adapter.fetchFeed('https://example.com/feed.xml')
      ).rejects.toThrow('Network request failed');
    });

    it('throws error on malformed XML', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => 'This is not XML',
        headers: new Headers(),
      });

      await expect(
        adapter.fetchFeed('https://example.com/feed.xml')
      ).rejects.toThrow();
    });

    it('throws error on unsupported feed format', async () => {
      const invalidXML = `<?xml version="1.0" encoding="UTF-8"?>
<unsupported>
  <data>Not a valid RSS or Atom feed</data>
</unsupported>`;

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => invalidXML,
        headers: new Headers(),
      });

      await expect(
        adapter.fetchFeed('https://example.com/feed.xml')
      ).rejects.toThrow('Unknown or unsupported feed format');
    });

    it('continues parsing when individual item fails', async () => {
      const rss2XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test</title>
    <item>
      <guid>valid-item</guid>
      <title>Valid Post</title>
      <link>https://example.com/valid</link>
      <description>Valid content</description>
      <pubDate>Wed, 05 Feb 2026 12:00:00 GMT</pubDate>
    </item>
    <item>
      <!-- Missing both guid and link - should fail -->
      <title>Invalid Post</title>
      <description>No way to identify this</description>
      <pubDate>Wed, 05 Feb 2026 12:00:00 GMT</pubDate>
    </item>
    <item>
      <guid>another-valid</guid>
      <title>Another Valid</title>
      <link>https://example.com/another</link>
      <description>More valid content</description>
      <pubDate>Wed, 05 Feb 2026 12:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => rss2XML,
        headers: new Headers(),
      });

      const result = await adapter.fetchFeed('https://example.com/feed.xml');

      // Should parse 2 valid items, skip the invalid one
      expect(result.items).toHaveLength(2);
      expect(result.items[0].id).toBe('valid-item');
      expect(result.items[1].id).toBe('another-valid');
    });
  });

  describe('Feed Type Detection', () => {
    it('detects RSS 2.0 feed', () => {
      const rss2XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel><title>Test</title></channel>
</rss>`;

      expect(adapter.detectFeedType(rss2XML)).toBe('rss2');
    });

    it('detects Atom feed', () => {
      const atomXML = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Test</title>
</feed>`;

      expect(adapter.detectFeedType(atomXML)).toBe('atom');
    });

    it('returns unknown for invalid XML', () => {
      expect(adapter.detectFeedType('not xml')).toBe('unknown');
    });

    it('returns unknown for unsupported feed format', () => {
      const unsupportedXML = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="1.0">
  <head><title>OPML</title></head>
</opml>`;

      expect(adapter.detectFeedType(unsupportedXML)).toBe('unknown');
    });

    it('detects RSS 0.92 as rss2', () => {
      const rss092XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="0.92">
  <channel><title>Test</title></channel>
</rss>`;

      expect(adapter.detectFeedType(rss092XML)).toBe('rss2');
    });

    it('detects RSS 0.91 as rss2', () => {
      const rss091XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="0.91">
  <channel><title>Test</title></channel>
</rss>`;

      expect(adapter.detectFeedType(rss091XML)).toBe('rss2');
    });
  });

  describe('extractPostId', () => {
    it('uses GUID when present', async () => {
      const id = await adapter.extractPostId({
        guid: 'unique-guid-123',
        link: 'https://example.com/post',
      });

      expect(id).toBe('unique-guid-123');
    });

    it('trims whitespace from GUID', async () => {
      const id = await adapter.extractPostId({
        guid: '  spaced-guid  ',
        link: 'https://example.com/post',
      });

      expect(id).toBe('spaced-guid');
    });

    it('hashes link when GUID is missing', async () => {
      const id = await adapter.extractPostId({
        link: 'https://example.com/post-123',
      });

      // Should be a SHA-256 hex hash (64 characters)
      expect(id).toMatch(/^[a-f0-9]{64}$/);
    });

    it('hashes link when GUID is empty string', async () => {
      const id = await adapter.extractPostId({
        guid: '',
        link: 'https://example.com/post-456',
      });

      expect(id).toMatch(/^[a-f0-9]{64}$/);
    });

    it('hashes link when GUID is whitespace only', async () => {
      const id = await adapter.extractPostId({
        guid: '   ',
        link: 'https://example.com/post-789',
      });

      expect(id).toMatch(/^[a-f0-9]{64}$/);
    });

    it('throws error when both GUID and link are missing', async () => {
      await expect(
        adapter.extractPostId({ guid: '', link: '' })
      ).rejects.toThrow('Feed item missing both guid and link');
    });

    it('produces consistent hash for same link', async () => {
      const link = 'https://example.com/consistent';
      const id1 = await adapter.extractPostId({ link });
      const id2 = await adapter.extractPostId({ link });

      expect(id1).toBe(id2);
    });
  });

  describe('extractText', () => {
    it('prefers content over description', () => {
      const text = adapter.extractText({
        content: 'This is the content',
        description: 'This is the description',
      });

      expect(text).toBe('This is the content');
    });

    it('falls back to description when content is missing', () => {
      const text = adapter.extractText({
        description: 'This is the description',
      });

      expect(text).toBe('This is the description');
    });

    it('returns empty string when both are missing', () => {
      const text = adapter.extractText({});

      expect(text).toBe('');
    });

    it('strips HTML tags', () => {
      const text = adapter.extractText({
        content: '<p>Hello <strong>world</strong>!</p>',
      });

      expect(text).toBe('Hello world!');
    });

    it('normalizes whitespace', () => {
      const text = adapter.extractText({
        content: 'Too    much   \n\n  spacing',
      });

      expect(text).toBe('Too much spacing');
    });

    it('trims leading and trailing whitespace', () => {
      const text = adapter.extractText({
        content: '  \n  Trimmed text  \n  ',
      });

      expect(text).toBe('Trimmed text');
    });

    it('handles complex HTML structure', () => {
      const text = adapter.extractText({
        content: `
          <div>
            <h1>Title</h1>
            <p>Paragraph one.</p>
            <ul>
              <li>Item 1</li>
              <li>Item 2</li>
            </ul>
          </div>
        `,
      });

      expect(text).toContain('Title');
      expect(text).toContain('Paragraph one');
      expect(text).toContain('Item 1');
    });
  });
});
