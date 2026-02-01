// Help content: Glossary
// Defines key terms used throughout the application

import { useTestingMode } from '../../../context';

interface Term {
  term: string;
  stealthTerm?: string;
  definition: string;
  stealthDefinition?: string;
  specRef?: string;
}

const TERMS: Term[] = [
  {
    term: 'Signal Post',
    stealthTerm: 'Synced Item',
    definition: 'A post selected by the protocol to carry message bits. Determined by cryptographic hash comparison.',
    stealthDefinition: 'An item that has been synced and annotated by the system.',
    specRef: '§6.2',
  },
  {
    term: 'Cover Post',
    stealthTerm: 'Regular Item',
    definition: 'A post that is not selected as a signal. Published freely without affecting message transmission.',
    stealthDefinition: 'A standard feed item without annotations.',
    specRef: '§6.2',
  },
  {
    term: 'Epoch Key',
    stealthTerm: 'Sync Period',
    definition: 'A derived key that changes with each beacon update. Used for post selection and message framing.',
    stealthDefinition: 'The current synchronization period for content processing.',
    specRef: '§5.1',
  },
  {
    term: 'Beacon',
    stealthTerm: 'Time Source',
    definition: 'A public, unpredictable value used for epoch synchronization. Options: Bitcoin block hash, NIST randomness beacon, or UTC date.',
    stealthDefinition: 'The time reference used for sync scheduling.',
    specRef: '§4',
  },
  {
    term: 'Channel',
    stealthTerm: 'Feed Group',
    definition: 'A communication link between sender and receiver, identified by a shared 32-byte key.',
    stealthDefinition: 'A collection of feeds grouped for synchronized reading.',
    specRef: '§5',
  },
  {
    term: 'Selection Rate',
    stealthTerm: 'Sync Frequency',
    definition: 'The probability that a post is selected as a signal post. Default is 0.25 (25%).',
    stealthDefinition: 'How often items are selected for annotation.',
    specRef: '§6.1',
  },
  {
    term: 'Feature Extraction',
    stealthTerm: 'Content Analysis',
    definition: 'The process of deriving bits from post characteristics: length threshold, media presence, punctuation.',
    stealthDefinition: 'Analyzing content for categorization.',
    specRef: '§8.2',
  },
  {
    term: 'HMAC',
    stealthTerm: 'Verification',
    definition: 'Hash-based Message Authentication Code. 64-bit truncated HMAC-SHA256 authenticates each message.',
    stealthDefinition: 'A check to verify content integrity.',
    specRef: '§8.4',
  },
  {
    term: 'Reed-Solomon',
    stealthTerm: 'Error Recovery',
    definition: 'Error correction coding that can recover from up to 4 corrupted symbols per message.',
    stealthDefinition: 'A system for recovering from sync errors.',
    specRef: '§8.3',
  },
  {
    term: 'Message Frame',
    stealthTerm: 'Data Packet',
    definition: 'The encoded structure containing version, flags, payload length, payload, ECC symbols, and authentication tag.',
    stealthDefinition: 'A unit of synchronized data.',
    specRef: '§8',
  },
];

export function Glossary() {
  const testingMode = useTestingMode();

  return (
    <article className="help-content">
      <h2>{testingMode ? 'Protocol Glossary' : 'Glossary'}</h2>

      <dl className="help-glossary">
        {TERMS.map(({ term, stealthTerm, definition, stealthDefinition, specRef }) => (
          <div key={term} className="help-glossary-item">
            <dt>{testingMode ? term : (stealthTerm || term)}</dt>
            <dd>
              {testingMode ? definition : (stealthDefinition || definition)}
              {testingMode && specRef && (
                <span className="help-spec-ref">SPEC.md {specRef}</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
