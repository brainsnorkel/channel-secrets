import { useState, useEffect } from 'react';
import { useTestingMode } from '../../context';
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
    title: 'Time Expectations',
    description: 'Why messages take days, not seconds',
  },
  {
    id: 5,
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

/** Step 4: Time Expectations */
function Step4() {
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

/** Step 5: Your First Channel */
function Step5({
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
 * Onboarding modal with 5-step walkthrough.
 * Disabled in testing mode.
 */
export function OnboardingModal({
  isOpen,
  onComplete,
  onCreateChannel,
  onImportChannel,
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
    setCurrentStep(5); // Jump to channel setup
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
          {currentStep === 4 && <Step4 />}
          {currentStep === 5 && (
            <Step5 onCreateChannel={onCreateChannel} onImportChannel={onImportChannel} />
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
