// Help content: Overview
// Introduces what StegoChannel is and how it works

import { useTestingMode } from '../../../context';

export function Overview() {
  const testingMode = useTestingMode();

  return (
    <article className="help-content">
      <h2>Overview</h2>

      <section>
        <h3>What is {testingMode ? 'StegoChannel' : 'this app'}?</h3>
        <p>
          {testingMode
            ? 'StegoChannel is a steganographic communication protocol that hides messages in the selection of social media posts.'
            : 'This is a feed reader with advanced sync capabilities that help you organize and annotate content across platforms.'}
        </p>
        {testingMode && (
          <p className="help-spec-ref">See SPEC.md §1 (Introduction)</p>
        )}
      </section>

      <section>
        <h3>How does it work?</h3>
        {testingMode ? (
          <>
            <p>
              Unlike traditional steganography that modifies content, StegoChannel hides information
              in <strong>which posts you choose to publish</strong>. The protocol:
            </p>
            <ol>
              <li>Uses a shared secret key between sender and receiver</li>
              <li>Derives an "epoch key" from the channel key and a public beacon (like Bitcoin block hashes)</li>
              <li>Deterministically selects ~25% of posts as "signal posts" based on cryptographic hashing</li>
              <li>Extracts bits from signal post features (length, media presence, punctuation)</li>
              <li>Assembles bits into a message frame with error correction and authentication</li>
            </ol>
            <p className="help-spec-ref">See SPEC.md §3 (Protocol Overview)</p>
          </>
        ) : (
          <p>
            The app monitors your subscribed feeds and synchronizes annotations based on
            your configured preferences. Content is processed locally for your privacy.
          </p>
        )}
      </section>

      <section>
        <h3>{testingMode ? 'Security Properties' : 'Privacy Features'}</h3>
        {testingMode ? (
          <>
            <ul>
              <li><strong>Plausible deniability:</strong> Without the key, signal posts look like normal posts</li>
              <li><strong>Forward secrecy:</strong> Epoch keys rotate, limiting exposure if compromised</li>
              <li><strong>Integrity:</strong> Messages are authenticated with HMAC-SHA256</li>
              <li><strong>Error tolerance:</strong> Reed-Solomon coding corrects transmission errors</li>
            </ul>
            <p className="help-spec-ref">See SPEC.md §11 (Security Considerations)</p>
          </>
        ) : (
          <ul>
            <li>All data is stored locally on your device</li>
            <li>Content is encrypted at rest with your passphrase</li>
            <li>No data is sent to third-party servers</li>
          </ul>
        )}
      </section>
    </article>
  );
}
