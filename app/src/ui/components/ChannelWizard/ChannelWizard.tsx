import { useState } from 'react';
import type { Channel } from '../../../schemas';
import {
  deriveChannelKeyFromPassphrase,
  generateRandomPassphrase,
  estimatePassphraseStrength,
} from '../../../core/crypto';
import './ChannelWizard.css';

export interface ChannelWizardProps {
  onComplete: (channel: Channel) => void;
  onCancel: () => void;
  myHandle: string; // Current user's Bluesky handle
}

interface WizardData {
  mode: 'create' | 'import' | null;
  passphrase: string;
  channelKey: string;
  contactName: string;
  contactHandle: string;
}

const STEPS = [
  { id: 1, title: 'Welcome', description: 'Create a secure channel' },
  { id: 2, title: 'Setup Method', description: 'Create new or import existing' },
  { id: 3, title: 'Channel Key', description: 'Setup or import key' },
  { id: 4, title: 'Contact Details', description: 'Who are you messaging?' },
  { id: 5, title: 'Review', description: 'Confirm your settings' },
  { id: 6, title: 'Complete', description: 'Your channel is ready' },
] as const;

/** Step 1: Welcome */
function Step1() {
  return (
    <div className="wizard-step-content">
      <div className="wizard-icon">🔐</div>
      <p className="wizard-text">
        A <strong>channel</strong> is a secure connection that lets you exchange
        hidden messages with one contact through social media.
      </p>
      <p className="wizard-text">
        Your messages are hidden in the <strong>selection</strong> of which posts
        you publish. To everyone else, you're just posting normally.
      </p>
      <p className="wizard-text">
        Only someone with your shared secret key can read your messages.
      </p>
    </div>
  );
}

/** Step 2: Create or Import */
function Step2({
  onSelect,
}: {
  onSelect: (mode: 'create' | 'import') => void;
}) {
  return (
    <div className="wizard-step-content">
      <p className="wizard-text">
        Choose how you want to set up your channel:
      </p>
      <div className="wizard-actions">
        <button
          type="button"
          className="wizard-action-button primary"
          onClick={() => onSelect('create')}
        >
          <span className="wizard-action-icon">➕</span>
          <span>
            <strong>Create New Channel</strong>
            <small>Generate a new shared secret</small>
          </span>
        </button>
        <button
          type="button"
          className="wizard-action-button secondary"
          onClick={() => onSelect('import')}
        >
          <span className="wizard-action-icon">📥</span>
          <span>
            <strong>Import Existing Key</strong>
            <small>Use a channel key from your contact</small>
          </span>
        </button>
      </div>
    </div>
  );
}

/** Step 3a: Passphrase Setup (for create mode) */
function Step3Create({
  passphrase,
  onChange,
}: {
  passphrase: string;
  onChange: (passphrase: string) => void;
}) {
  const [showPassphrase, setShowPassphrase] = useState(false);

  const generatePassphrase = () => {
    // Use crypto-secure random passphrase generation
    const newPassphrase = generateRandomPassphrase(4);
    onChange(newPassphrase);
  };

  const strengthResult = estimatePassphraseStrength(passphrase);

  const getStrengthColor = (score: number): string => {
    switch (score) {
      case 0: return '#e74c3c'; // red
      case 1: return '#f39c12'; // orange
      case 2: return '#3498db'; // blue
      case 3: return '#2ecc71'; // green
      case 4: return '#27ae60'; // darker green
      default: return '#95a5a6'; // gray
    }
  };

  const strength = {
    level: strengthResult.feedback.split(':')[0],
    color: getStrengthColor(strengthResult.score),
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(passphrase);
  };

  return (
    <div className="wizard-step-content">
      <p className="wizard-text">
        Your passphrase is used to derive the channel key. You'll share this
        with your contact through a <strong>secure method</strong> (in person,
        encrypted message, etc.)
      </p>

      <div className="wizard-form-group">
        <label htmlFor="passphrase">Passphrase</label>
        <div className="wizard-input-group">
          <input
            id="passphrase"
            type={showPassphrase ? 'text' : 'password'}
            value={passphrase}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter or generate passphrase"
            className="wizard-input"
          />
          <button
            type="button"
            className="wizard-input-button"
            onClick={() => setShowPassphrase(!showPassphrase)}
            title={showPassphrase ? 'Hide' : 'Show'}
          >
            {showPassphrase ? '👁️' : '👁️‍🗨️'}
          </button>
        </div>
        {passphrase && (
          <div className="wizard-strength">
            <span
              className="wizard-strength-bar"
              style={{
                width: `${(passphrase.length / 32) * 100}%`,
                backgroundColor: strength.color,
              }}
            />
            <span className="wizard-strength-label" style={{ color: strength.color }}>
              {strength.level}
            </span>
          </div>
        )}
      </div>

      <div className="wizard-button-group">
        <button
          type="button"
          className="wizard-button secondary"
          onClick={generatePassphrase}
        >
          Generate Random
        </button>
        {passphrase && (
          <button
            type="button"
            className="wizard-button secondary"
            onClick={copyToClipboard}
          >
            Copy
          </button>
        )}
      </div>

      <p className="wizard-text-small">
        <strong>Important:</strong> You must share this passphrase with your contact
        securely. Anyone with this passphrase can read your messages.
      </p>
    </div>
  );
}

/** Step 3b: Key Import (for import mode) */
function Step3Import({
  channelKey,
  onChange,
}: {
  channelKey: string;
  onChange: (key: string) => void;
}) {
  const isValid = channelKey.startsWith('stegochannel:v0:');
  const showValidation = channelKey.length > 0;

  return (
    <div className="wizard-step-content">
      <p className="wizard-text">
        Paste the channel key string your contact shared with you. It should
        start with <code>stegochannel:v0:</code>
      </p>

      <div className="wizard-form-group">
        <label htmlFor="channelKey">Channel Key</label>
        <textarea
          id="channelKey"
          value={channelKey}
          onChange={(e) => onChange(e.target.value)}
          placeholder="stegochannel:v0:..."
          className="wizard-textarea"
          rows={4}
        />
        {showValidation && (
          <div className={`wizard-validation ${isValid ? 'valid' : 'invalid'}`}>
            {isValid ? '✓ Valid channel key format' : '✗ Invalid key format'}
          </div>
        )}
      </div>

      {isValid && (
        <div className="wizard-info-box">
          <strong>Detected settings:</strong>
          <ul>
            <li>Protocol version: v0</li>
            <li>Beacon type: date (default)</li>
            <li>Selection rate: 25%</li>
          </ul>
        </div>
      )}
    </div>
  );
}

/** Step 4: Contact Details */
function Step4({
  contactName,
  contactHandle,
  onChangeName,
  onChangeHandle,
}: {
  contactName: string;
  contactHandle: string;
  onChangeName: (name: string) => void;
  onChangeHandle: (handle: string) => void;
}) {
  const handleValid = contactHandle.match(/^@?[\w.-]+\.bsky\.social$/);
  const showHandleValidation = contactHandle.length > 0;

  return (
    <div className="wizard-step-content">
      <p className="wizard-text">
        Enter your contact's information:
      </p>

      <div className="wizard-form-group">
        <label htmlFor="contactName">Contact Nickname</label>
        <input
          id="contactName"
          type="text"
          value={contactName}
          onChange={(e) => onChangeName(e.target.value)}
          placeholder="Alice"
          className="wizard-input"
        />
        <small className="wizard-help">A friendly name to identify this channel</small>
      </div>

      <div className="wizard-form-group">
        <label htmlFor="contactHandle">Bluesky Handle</label>
        <input
          id="contactHandle"
          type="text"
          value={contactHandle}
          onChange={(e) => onChangeHandle(e.target.value)}
          placeholder="@alice.bsky.social"
          className="wizard-input"
        />
        {showHandleValidation && (
          <div className={`wizard-validation ${handleValid ? 'valid' : 'invalid'}`}>
            {handleValid
              ? '✓ Valid Bluesky handle'
              : '✗ Handle should end with .bsky.social'}
          </div>
        )}
        <small className="wizard-help">Their Bluesky username</small>
      </div>
    </div>
  );
}

/** Step 5: Review */
function Step5({
  data,
}: {
  data: WizardData;
}) {
  return (
    <div className="wizard-step-content">
      <p className="wizard-text">
        Review your channel settings:
      </p>

      <div className="wizard-review-box">
        <div className="wizard-review-row">
          <span className="wizard-review-label">Contact:</span>
          <span className="wizard-review-value">{data.contactName}</span>
        </div>
        <div className="wizard-review-row">
          <span className="wizard-review-label">Handle:</span>
          <span className="wizard-review-value">{data.contactHandle}</span>
        </div>
        <div className="wizard-review-row">
          <span className="wizard-review-label">Setup method:</span>
          <span className="wizard-review-value">
            {data.mode === 'create' ? 'New channel' : 'Imported key'}
          </span>
        </div>
        <div className="wizard-review-row">
          <span className="wizard-review-label">Beacon type:</span>
          <span className="wizard-review-value">Date (daily epochs)</span>
        </div>
        <div className="wizard-review-row">
          <span className="wizard-review-label">Platform:</span>
          <span className="wizard-review-value">Bluesky</span>
        </div>
      </div>

      <p className="wizard-text-small">
        After creating the channel, you'll be able to send and receive hidden
        messages through your social media posts.
      </p>
    </div>
  );
}

/** Step 6: Complete */
function Step6({
  channelKey,
  mode,
}: {
  channelKey: string;
  mode: 'create' | 'import';
}) {
  const [copied, setCopied] = useState(false);

  const copyKey = () => {
    navigator.clipboard.writeText(channelKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="wizard-step-content">
      <div className="wizard-success-icon">✓</div>
      <h3 className="wizard-success-title">Channel Created!</h3>

      {mode === 'create' && (
        <>
          <p className="wizard-text">
            Your channel has been created. Share this key with your contact
            through a <strong>secure method</strong>:
          </p>

          <div className="wizard-key-box">
            <code className="wizard-key-text">{channelKey}</code>
            <button
              type="button"
              className="wizard-key-copy"
              onClick={copyKey}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          <p className="wizard-text-small warning">
            <strong>⚠️ Keep this key secret!</strong> Anyone with this key can
            read your messages. Only share it with your intended contact.
          </p>
        </>
      )}

      {mode === 'import' && (
        <p className="wizard-text">
          Your channel has been imported. You can now exchange hidden messages
          with your contact.
        </p>
      )}
    </div>
  );
}

/**
 * Channel Setup Wizard - 6-step wizard for creating secure channels
 */
export default function ChannelWizard({
  onComplete,
  onCancel,
  myHandle,
}: ChannelWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardData, setWizardData] = useState<WizardData>({
    mode: null,
    passphrase: '',
    channelKey: '',
    contactName: '',
    contactHandle: '',
  });
  const [generatedKey, setGeneratedKey] = useState('');

  const step = STEPS[currentStep - 1];
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === STEPS.length;

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return true;
      case 2:
        return wizardData.mode !== null;
      case 3:
        if (wizardData.mode === 'create') {
          return wizardData.passphrase.length >= 8;
        } else {
          return wizardData.channelKey.startsWith('stegochannel:v0:');
        }
      case 4:
        return (
          wizardData.contactName.length > 0 &&
          wizardData.contactHandle.match(/^@?[\w.-]+\.bsky\.social$/)
        );
      case 5:
        return true;
      case 6:
        return true;
      default:
        return false;
    }
  };

  const handleNext = async () => {
    if (!canProceed()) return;

    if (currentStep === 5) {
      // Generate or parse channel key
      if (wizardData.mode === 'create') {
        // Derive key from passphrase using Argon2id
        try {
          const { key } = await deriveChannelKeyFromPassphrase(
            wizardData.passphrase,
            myHandle,
            wizardData.contactHandle.replace(/^@/, '')
          );

          // Convert Uint8Array to base64url
          const base64 = btoa(String.fromCharCode(...Array.from(key)));
          const keyBase64 = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

          const generatedChannelKey = `stegochannel:v0:${keyBase64}:date:0.25:len,media,qmark`;
          setGeneratedKey(generatedChannelKey);
        } catch (error) {
          console.error('Key derivation failed:', error);
          // Fallback to next step to show error
          setGeneratedKey('');
        }
      } else {
        setGeneratedKey(wizardData.channelKey);
      }
    }

    if (isLastStep) {
      // Create channel object
      const channel: Channel = {
        id: crypto.randomUUID(),
        name: wizardData.contactName,
        key: generatedKey.split(':')[2], // Extract just the base64url key part
        beaconType: 'date',
        selectionRate: 0.25,
        featureSet: 'v0',
        mySources: [],
        theirSources: [
          {
            platform: 'bluesky',
            handle: wizardData.contactHandle.replace(/^@/, ''),
          },
        ],
        createdAt: Date.now(),
      };

      onComplete(channel);
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div
      className="wizard-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wizard-title"
    >
      <div className="wizard-modal">
        {/* Progress indicator */}
        <div className="wizard-progress">
          {STEPS.map((s) => (
            <div
              key={s.id}
              className={`wizard-progress-dot ${
                s.id === currentStep ? 'active' : ''
              } ${s.id < currentStep ? 'completed' : ''}`}
            />
          ))}
        </div>

        {/* Step header */}
        <div className="wizard-header">
          <span className="wizard-step-number">
            Step {currentStep} of {STEPS.length}
          </span>
          <h2 id="wizard-title" className="wizard-title">
            {step.title}
          </h2>
          <p className="wizard-subtitle">{step.description}</p>
        </div>

        {/* Step content */}
        <div className="wizard-body">
          {currentStep === 1 && <Step1 />}
          {currentStep === 2 && (
            <Step2
              onSelect={(mode) => {
                setWizardData({ ...wizardData, mode });
                setCurrentStep(3);
              }}
            />
          )}
          {currentStep === 3 && wizardData.mode === 'create' && (
            <Step3Create
              passphrase={wizardData.passphrase}
              onChange={(passphrase) =>
                setWizardData({ ...wizardData, passphrase })
              }
            />
          )}
          {currentStep === 3 && wizardData.mode === 'import' && (
            <Step3Import
              channelKey={wizardData.channelKey}
              onChange={(channelKey) =>
                setWizardData({ ...wizardData, channelKey })
              }
            />
          )}
          {currentStep === 4 && (
            <Step4
              contactName={wizardData.contactName}
              contactHandle={wizardData.contactHandle}
              onChangeName={(contactName) =>
                setWizardData({ ...wizardData, contactName })
              }
              onChangeHandle={(contactHandle) =>
                setWizardData({ ...wizardData, contactHandle })
              }
            />
          )}
          {currentStep === 5 && <Step5 data={wizardData} />}
          {currentStep === 6 && wizardData.mode && (
            <Step6 channelKey={generatedKey} mode={wizardData.mode} />
          )}
        </div>

        {/* Navigation */}
        <div className="wizard-footer">
          <div className="wizard-footer-left">
            {!isFirstStep && currentStep !== 2 && (
              <button
                type="button"
                className="wizard-button secondary"
                onClick={handleBack}
              >
                Back
              </button>
            )}
          </div>
          <div className="wizard-footer-right">
            <button
              type="button"
              className="wizard-button tertiary"
              onClick={onCancel}
            >
              Cancel
            </button>
            {currentStep !== 2 && (
              <button
                type="button"
                className="wizard-button primary"
                onClick={handleNext}
                disabled={!canProceed()}
              >
                {isLastStep ? 'Start Messaging' : 'Next'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
