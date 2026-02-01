// Help content: Security Model
// Explains the security properties and threat model

import { useTestingMode } from '../../../context';

export function SecurityModel() {
  const testingMode = useTestingMode();

  if (!testingMode) {
    // In production mode, show minimal security info
    return (
      <article className="help-content">
        <h2>Privacy & Security</h2>

        <section>
          <h3>Local Storage</h3>
          <p>
            All your data is stored locally on your device and encrypted with your passphrase.
            We cannot access your data, and nothing is sent to our servers.
          </p>
        </section>

        <section>
          <h3>Encryption</h3>
          <p>
            Your passphrase is used to derive an encryption key using industry-standard
            key derivation. Even if someone accesses your device storage, they cannot
            read your data without your passphrase.
          </p>
        </section>

        <section>
          <h3>Best Practices</h3>
          <ul>
            <li>Use a strong, unique passphrase</li>
            <li>Don't share your passphrase with others</li>
            <li>Lock the app when not in use</li>
            <li>Keep your device software updated</li>
          </ul>
        </section>
      </article>
    );
  }

  // Testing mode: full technical security model
  return (
    <article className="help-content">
      <h2>Security Model</h2>
      <p className="help-spec-ref">Reference: SPEC.md §11 (Security Considerations)</p>

      <section>
        <h3>Threat Model</h3>
        <p>StegoChannel is designed to resist:</p>
        <ul>
          <li>
            <strong>Passive observation:</strong> An adversary monitoring your public posts
            cannot determine which are signal posts without the channel key.
          </li>
          <li>
            <strong>Traffic analysis:</strong> Your posting frequency and patterns remain
            natural since cover posts are published freely.
          </li>
          <li>
            <strong>Historical analysis:</strong> Epoch keys rotate with each beacon update,
            providing limited forward secrecy.
          </li>
        </ul>
        <p className="help-spec-ref">See SPEC.md §11.1</p>
      </section>

      <section>
        <h3>What StegoChannel Does NOT Protect Against</h3>
        <ul>
          <li>
            <strong>Device compromise:</strong> An adversary with access to your device
            can extract stored keys and messages.
          </li>
          <li>
            <strong>Key compromise:</strong> If the channel key is exposed, all past
            messages (with stored posts) become readable.
          </li>
          <li>
            <strong>Rubber hose cryptanalysis:</strong> Coercion attacks can extract
            keys from users.
          </li>
          <li>
            <strong>App detection:</strong> The presence of this app on your device
            may be discoverable.
          </li>
        </ul>
        <p className="help-spec-ref">See SPEC.md §11.2</p>
      </section>

      <section>
        <h3>Cryptographic Primitives</h3>
        <table className="help-table">
          <thead>
            <tr>
              <th>Purpose</th>
              <th>Algorithm</th>
              <th>Reference</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Key Derivation</td>
              <td>HKDF-SHA256 (RFC 5869)</td>
              <td>§5.1</td>
            </tr>
            <tr>
              <td>Post Selection</td>
              <td>SHA-256 hash comparison</td>
              <td>§6</td>
            </tr>
            <tr>
              <td>Optional Encryption</td>
              <td>XChaCha20-Poly1305</td>
              <td>§8.5</td>
            </tr>
            <tr>
              <td>Authentication</td>
              <td>HMAC-SHA256 (64-bit truncated)</td>
              <td>§8.4</td>
            </tr>
            <tr>
              <td>Error Correction</td>
              <td>Reed-Solomon (4 symbol tolerance)</td>
              <td>§8.3</td>
            </tr>
            <tr>
              <td>Local Storage</td>
              <td>Argon2id + AES-256-GCM</td>
              <td>§12.1</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h3>Plausible Deniability</h3>
        <p>
          The protocol provides plausible deniability through several mechanisms:
        </p>
        <ul>
          <li>Signal posts are indistinguishable from cover posts without the key</li>
          <li>The app presents as a normal feed reader ("FeedDeck")</li>
          <li>Feature extraction uses naturally-occurring post characteristics</li>
          <li>Posting patterns remain consistent with normal social media use</li>
        </ul>
        <p>
          However, plausible deniability is weakened if:
        </p>
        <ul>
          <li>The app itself is discovered on your device</li>
          <li>You exhibit unusual posting patterns</li>
          <li>An adversary correlates your posts with another party's behavior</li>
        </ul>
        <p className="help-spec-ref">See SPEC.md §11.3</p>
      </section>

      <section>
        <h3>Recommendations</h3>
        <ul>
          <li>Use strong, unique channel keys (32 bytes of high entropy)</li>
          <li>Exchange keys through secure, ephemeral channels</li>
          <li>Maintain natural posting patterns on all platforms</li>
          <li>Consider using the 'date' beacon for slower but more predictable epochs</li>
          <li>Regularly rotate channel keys for sensitive communications</li>
          <li>Be aware that metadata (posting times, platforms) may be observable</li>
        </ul>
      </section>
    </article>
  );
}
