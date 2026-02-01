// Help content: FAQ
// Frequently asked questions

import { useTestingMode } from '../../../context';

interface FAQItem {
  question: string;
  stealthQuestion?: string;
  answer: string;
  stealthAnswer?: string;
  specRef?: string;
}

const FAQS: FAQItem[] = [
  {
    question: 'Why do messages take days to send?',
    stealthQuestion: 'Why does sync take so long?',
    answer: 'StegoChannel is a low-bandwidth protocol by design. At ~3 bits per signal post and ~25% selection rate, you transmit roughly 8 bits per day with normal posting frequency. A short message (10 bytes) requires ~80 bits, taking 2-7 days. This slowness provides security—fast covert communication is suspicious.',
    stealthAnswer: 'The app processes content gradually to minimize resource usage and avoid rate limits. This ensures reliable sync without impacting your device performance.',
    specRef: '§10 (Bandwidth)',
  },
  {
    question: 'What if I post less frequently?',
    stealthQuestion: 'What if I use the app less often?',
    answer: 'Lower posting frequency means slower message transmission. The protocol adapts to your natural posting patterns. If you post once a week, expect messages to take several weeks.',
    stealthAnswer: 'The app syncs based on available content. Less frequent usage means less content to process.',
  },
  {
    question: 'Can someone tell I\'m using StegoChannel?',
    stealthQuestion: 'Is my activity visible to others?',
    answer: 'Without your channel key, an observer cannot distinguish signal posts from cover posts. Your posting pattern remains natural. However, the app installation itself could be discovered through device inspection.',
    stealthAnswer: 'Your reading and annotation activity is local to your device. Other users cannot see what you\'ve synced.',
    specRef: '§11.1 (Threat Model)',
  },
  {
    question: 'What happens if posts get deleted?',
    stealthQuestion: 'What if content disappears?',
    answer: 'Deleted signal posts create gaps in the bit stream. Reed-Solomon error correction can recover from up to 4 missing symbols. Beyond that, the message may be unrecoverable. Receivers should process posts promptly.',
    stealthAnswer: 'Deleted content may affect annotations. The app uses error recovery to handle missing data when possible.',
    specRef: '§8.3 (Error Correction)',
  },
  {
    question: 'How do I share a channel key securely?',
    stealthQuestion: 'How do I share my feed group?',
    answer: 'Exchange the key through a secure out-of-band channel: in person, encrypted messaging, or QR code. Never transmit the key over the same platform you\'ll use for communication.',
    stealthAnswer: 'Export your feed group configuration and share it securely with others who need access.',
    specRef: '§5 (Key Derivation)',
  },
  {
    question: 'What are the supported platforms?',
    stealthQuestion: 'What feeds are supported?',
    answer: 'Currently: Bluesky (AT Protocol) and RSS/Atom feeds. The protocol is platform-agnostic—any system with stable post IDs and observable features can be supported.',
    stealthAnswer: 'The app supports Bluesky social feeds and standard RSS/Atom feeds from blogs and news sites.',
  },
  {
    question: 'Why use Bitcoin/NIST beacons?',
    stealthQuestion: 'Why different time sources?',
    answer: 'Beacons provide unpredictable public values for epoch synchronization. Bitcoin blocks (~10 min) offer censorship resistance. NIST beacon (~1 min) provides faster epochs. Date beacon (daily) is simplest but predictable.',
    stealthAnswer: 'Different time sources offer trade-offs between sync frequency and reliability.',
    specRef: '§4 (Beacon Synchronization)',
  },
];

export function FAQ() {
  const testingMode = useTestingMode();

  return (
    <article className="help-content">
      <h2>{testingMode ? 'Frequently Asked Questions' : 'FAQ'}</h2>

      <div className="help-faq-list">
        {FAQS.map(({ question, stealthQuestion, answer, stealthAnswer, specRef }, index) => (
          <details key={index} className="help-faq-item">
            <summary>{testingMode ? question : (stealthQuestion || question)}</summary>
            <div className="help-faq-answer">
              <p>{testingMode ? answer : (stealthAnswer || answer)}</p>
              {testingMode && specRef && (
                <p className="help-spec-ref">See SPEC.md {specRef}</p>
              )}
            </div>
          </details>
        ))}
      </div>
    </article>
  );
}
