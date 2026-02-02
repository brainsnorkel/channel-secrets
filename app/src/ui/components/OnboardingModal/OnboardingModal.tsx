import { useState, useEffect } from 'react';
import { useTestingMode } from '../../context';
import { BlueskyLogin } from '../BlueskyLogin/BlueskyLogin';
import type { AtpSessionData } from '@atproto/api';
import './OnboardingModal.css';

/** Onboarding step definitions */
const STEPS = [
  {
    id: 1,
    title: 'What is StegoChannel?',
    description: 'A new way to communicate privately',
  },
  {
    id: 2,
    title: 'Signal vs Cover',
    description: 'How your posts carry hidden data',
  },
  {
    id: 3,
    title: 'How Posts Encode Bits',
    description: 'The features that matter',
  },
  {
    id: 4,
    title: 'Connect to Bluesky',
    description: 'Access your account to monitor posts',
  },
  {
    id: 5,
    title: 'How Sending Works',
    description: 'The sender workflow explained',
  },
  {
    id: 6,
    title: 'Try It: Bit Encoding',
    description: 'See how post features encode data',
  },
  {
    id: 7,
    title: 'Time Expectations',
    description: 'Why messages take days, not seconds',
  },
  {
    id: 8,
    title: 'Your First Channel',
    description: 'Get started with secure messaging',
  },
] as const;

export interface OnboardingModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when onboarding completes (either finished or skipped) */
  onComplete: () => void;
  /** Callback when user wants to create a new channel */
  onCreateChannel?: () => void;
  /** Callback when user wants to import an existing channel */
  onImportChannel?: () => void;
  /** Callback when Bluesky login succeeds */
  onBlueskyLogin?: (session: AtpSessionData) => void;
}

/** Step 1: What is StegoChannel */
function Step1() {
  return (
    <div className="onboarding-step-content">
      <div className="onboarding-diagram onboarding-diagram-animated">
        <div className="onboarding-diagram-row">
          <div className="onboarding-diagram-box">Message</div>
          <div className="onboarding-diagram-arrow">→</div>
          <div className="onboarding-diagram-box">Hidden in<br/>Selection</div>
          <div className="onboarding-diagram-arrow">→</div>
          <div className="onboarding-diagram-box">Normal<br/>Posts</div>
        </div>
      </div>
      <p className="onboarding-text">
        StegoChannel hides your messages not by changing what you write, but by
        choosing <strong>which posts</strong> you publish. To anyone watching,
        you're just posting normally on social media.
      </p>
      <p className="onboarding-text">
        Only someone with your shared secret key can tell which posts carry
        hidden data—and what that data says.
      </p>
    </div>
  );
}

/** Step 2: Signal vs Cover */
function Step2() {
  return (
    <div className="onboarding-step-content">
      <div className="onboarding-diagram">
        <div className="onboarding-posts-visual">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div
              key={i}
              className={`onboarding-post-dot ${i === 1 || i === 4 ? 'signal' : 'cover'}`}
              title={i === 1 || i === 4 ? 'Signal post' : 'Cover post'}
            />
          ))}
        </div>
        <div className="onboarding-posts-legend">
          <span className="onboarding-legend-item">
            <span className="onboarding-post-dot signal small" /> Signal (~25%)
          </span>
          <span className="onboarding-legend-item">
            <span className="onboarding-post-dot cover small" /> Cover (~75%)
          </span>
        </div>
      </div>
      <p className="onboarding-text">
        About <strong>25% of your posts</strong> are automatically selected as
        "signal posts" based on a cryptographic formula. These carry your message bits.
      </p>
      <p className="onboarding-text">
        The rest are "cover posts"—they maintain your normal posting pattern and
        provide <strong>plausible deniability</strong>. You can post these freely.
      </p>
    </div>
  );
}

/** Step 3: How Posts Encode Bits */
function Step3() {
  return (
    <div className="onboarding-step-content">
      <div className="onboarding-diagram">
        <div className="onboarding-features-visual">
          <div className="onboarding-feature-row">
            <span className="onboarding-feature-name">Length</span>
            <span className="onboarding-feature-rule">≥50 chars = 1</span>
          </div>
          <div className="onboarding-feature-row">
            <span className="onboarding-feature-name">Media</span>
            <span className="onboarding-feature-rule">Has image = 1</span>
          </div>
          <div className="onboarding-feature-row">
            <span className="onboarding-feature-name">Question</span>
            <span className="onboarding-feature-rule">Has ? = 1</span>
          </div>
        </div>
        <div className="onboarding-bits-example">
          Example: "Hello!" → <code>0b001</code> (short, no media, no ?)
        </div>
      </div>
      <p className="onboarding-text">
        Each signal post encodes <strong>3 bits</strong> of your message based
        on its characteristics. The app shows you what bits your post encodes
        and what you need.
      </p>
      <p className="onboarding-text">
        You write naturally—the app just tells you when a post matches.
      </p>
    </div>
  );
}

/** Step 4: Connect to Bluesky */
function Step4({ onBlueskyLogin }: { onBlueskyLogin?: (session: AtpSessionData) => void }) {
  return (
    <div className="onboarding-step-content">
      <p className="onboarding-text">
        We need to access your Bluesky account to monitor posts and help you send messages.
        This requires an <strong>app password</strong>, not your main password.
      </p>
      <div className="onboarding-diagram">
        <div className="onboarding-bluesky-info">
          <div className="onboarding-info-icon">🔐</div>
          <p className="onboarding-info-text">
            App passwords are safer and can be revoked anytime without changing your main password.
          </p>
        </div>
      </div>
      <div className="onboarding-bluesky-login-wrapper">
        <BlueskyLogin
          onLoginSuccess={(session) => {
            onBlueskyLogin?.(session);
          }}
        />
      </div>
      <p className="onboarding-text-small">
        <a
          href="https://bsky.app/settings/app-passwords"
          target="_blank"
          rel="noopener noreferrer"
          className="onboarding-link"
        >
          Generate an app password in Bluesky settings
        </a>
      </p>
    </div>
  );
}

/** Step 5: How Sending Works */
function Step5() {
  return (
    <div className="onboarding-step-content">
      <div className="onboarding-diagram">
        <div className="onboarding-sender-flow">
          <div className="onboarding-flow-step">
            <div className="onboarding-flow-number">1</div>
            <div className="onboarding-flow-text">
              <strong>Compose normal posts</strong>
              <p>Write what you'd naturally share</p>
            </div>
          </div>
          <div className="onboarding-flow-arrow">↓</div>
          <div className="onboarding-flow-step">
            <div className="onboarding-flow-number">2</div>
            <div className="onboarding-flow-text">
              <strong>Some carry hidden bits</strong>
              <p>System selects ~25% as signal posts</p>
            </div>
          </div>
          <div className="onboarding-flow-arrow">↓</div>
          <div className="onboarding-flow-step">
            <div className="onboarding-flow-number">3</div>
            <div className="onboarding-flow-text">
              <strong>Complete your message</strong>
              <p>Multiple posts = full transmission</p>
            </div>
          </div>
        </div>
      </div>
      <p className="onboarding-text">
        <strong>Key point:</strong> Your posts look completely normal to everyone else.
        Only your recipient, with the shared key, can extract the hidden message.
      </p>
      <p className="onboarding-text">
        You maintain your regular posting pattern—no suspicious behavior, no detectable changes.
      </p>
    </div>
  );
}

/** Step 6: Interactive Feature Demo */
function Step6() {
  const [demoText, setDemoText] = useState('');
  const [hasMedia, setHasMedia] = useState(false);

  // Calculate feature bits
  const lengthBit = demoText.length >= 50 ? 1 : 0;
  const mediaBit = hasMedia ? 1 : 0;
  const questionBit = demoText.includes('?') ? 1 : 0;
  const bitsValue = (lengthBit << 2) | (mediaBit << 1) | questionBit;

  return (
    <div className="onboarding-step-content">
      <p className="onboarding-text">
        Try typing below and see how post features encode into bits in real-time:
      </p>
      <div className="onboarding-diagram">
        <div className="onboarding-demo-compose">
          <textarea
            className="onboarding-demo-textarea"
            placeholder="Type a post here..."
            value={demoText}
            onChange={(e) => setDemoText(e.target.value)}
            maxLength={300}
          />
          <div className="onboarding-demo-controls">
            <label className="onboarding-demo-checkbox">
              <input
                type="checkbox"
                checked={hasMedia}
                onChange={(e) => setHasMedia(e.target.checked)}
              />
              Has image/media
            </label>
            <span className="onboarding-demo-count">{demoText.length}/300</span>
          </div>
        </div>
        <div className="onboarding-demo-features">
          <div className={`onboarding-demo-bit ${lengthBit ? 'active' : ''}`}>
            <span className="onboarding-demo-bit-label">Length ≥50</span>
            <span className="onboarding-demo-bit-value">{lengthBit}</span>
          </div>
          <div className={`onboarding-demo-bit ${mediaBit ? 'active' : ''}`}>
            <span className="onboarding-demo-bit-label">Has media</span>
            <span className="onboarding-demo-bit-value">{mediaBit}</span>
          </div>
          <div className={`onboarding-demo-bit ${questionBit ? 'active' : ''}`}>
            <span className="onboarding-demo-bit-label">Has ?</span>
            <span className="onboarding-demo-bit-value">{questionBit}</span>
          </div>
        </div>
        <div className="onboarding-demo-result">
          Encoded bits: <code>0b{bitsValue.toString(2).padStart(3, '0')}</code> (decimal {bitsValue})
        </div>
      </div>
      <p className="onboarding-text">
        See? The bits depend on your post's content. The app guides you to match
        the bits you need for your message.
      </p>
    </div>
  );
}

/** Step 7: Time Expectations */
function Step7() {
  return (
    <div className="onboarding-step-content">
      <div className="onboarding-diagram">
        <div className="onboarding-timeline">
          <div className="onboarding-timeline-bar">
            <div className="onboarding-timeline-progress" style={{ width: '30%' }} />
          </div>
          <div className="onboarding-timeline-labels">
            <span>Day 1</span>
            <span>Day 3</span>
            <span>Day 7</span>
          </div>
          <div className="onboarding-timeline-caption">
            Typical message: 2-7 days
          </div>
        </div>
      </div>
      <p className="onboarding-text">
        This is a <strong>low-bandwidth protocol</strong>. At ~3 bits per signal post
        and ~25% selection rate, you transmit roughly 8 bits per day.
      </p>
      <p className="onboarding-text">
        A short message takes <strong>2-7 days</strong> to send. This is by design—
        fast communication is suspicious. The slowness is a feature, not a bug.
      </p>
    </div>
  );
}

/** Step 8: Your First Channel */
function Step8({
  onCreateChannel,
  onImportChannel,
}: {
  onCreateChannel?: () => void;
  onImportChannel?: () => void;
}) {
  return (
    <div className="onboarding-step-content">
      <p className="onboarding-text">
        You're ready to get started! A <strong>channel</strong> is a secure
        connection with another person, identified by a shared secret key.
      </p>
      <div className="onboarding-actions">
        <button
          type="button"
          className="onboarding-action-button primary"
          onClick={onCreateChannel}
        >
          Create New Channel
        </button>
        <button
          type="button"
          className="onboarding-action-button secondary"
          onClick={onImportChannel}
        >
          Import Existing Key
        </button>
      </div>
      <p className="onboarding-text-small">
        You'll need to exchange the key with your contact through a secure method
        (in person, encrypted message, etc.)
      </p>
    </div>
  );
}

/**
 * Onboarding modal with 8-step walkthrough.
 * Disabled in testing mode.
 */
export function OnboardingModal({
  isOpen,
  onComplete,
  onCreateChannel,
  onImportChannel,
  onBlueskyLogin,
}: OnboardingModalProps) {
  const testingMode = useTestingMode();
  const [currentStep, setCurrentStep] = useState(1);

  // Reset to step 1 when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
    }
  }, [isOpen]);

  // Don't show in testing mode
  if (testingMode || !isOpen) {
    return null;
  }

  const step = STEPS[currentStep - 1];
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === STEPS.length;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const handleFamiliarSkip = () => {
    setCurrentStep(8); // Jump to channel setup
  };

  return (
    <div className="onboarding-overlay" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <div className="onboarding-modal">
        {/* Progress indicator */}
        <div className="onboarding-progress">
          {STEPS.map((s) => (
            <div
              key={s.id}
              className={`onboarding-progress-dot ${s.id === currentStep ? 'active' : ''} ${s.id < currentStep ? 'completed' : ''}`}
            />
          ))}
        </div>

        {/* Step header */}
        <div className="onboarding-header">
          <span className="onboarding-step-number">Step {currentStep} of {STEPS.length}</span>
          <h2 id="onboarding-title" className="onboarding-title">{step.title}</h2>
          <p className="onboarding-subtitle">{step.description}</p>
        </div>

        {/* Step content */}
        <div className="onboarding-body">
          {currentStep === 1 && <Step1 />}
          {currentStep === 2 && <Step2 />}
          {currentStep === 3 && <Step3 />}
          {currentStep === 4 && <Step4 onBlueskyLogin={onBlueskyLogin} />}
          {currentStep === 5 && <Step5 />}
          {currentStep === 6 && <Step6 />}
          {currentStep === 7 && <Step7 />}
          {currentStep === 8 && (
            <Step8 onCreateChannel={onCreateChannel} onImportChannel={onImportChannel} />
          )}
        </div>

        {/* Navigation */}
        <div className="onboarding-footer">
          <div className="onboarding-footer-left">
            {isFirstStep ? (
              <button type="button" className="onboarding-link" onClick={handleFamiliarSkip}>
                I'm familiar with StegoChannel
              </button>
            ) : (
              <button type="button" className="onboarding-button secondary" onClick={handleBack}>
                Back
              </button>
            )}
          </div>
          <div className="onboarding-footer-right">
            <button type="button" className="onboarding-button tertiary" onClick={handleSkip}>
              Skip
            </button>
            {!isLastStep && (
              <button type="button" className="onboarding-button primary" onClick={handleNext}>
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
