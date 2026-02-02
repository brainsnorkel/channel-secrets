import React, { useState } from 'react';
import './CompositionTips.css';

interface CompositionTipsProps {
  currentBits: number[];
  targetBits: number[] | null;
  onDismiss?: () => void;
}

interface TipVariant {
  message: string;
  icon: string;
}

const TIP_VARIATIONS = {
  len: {
    need1: [
      "Your post could be a bit longer - try adding more detail",
      "Consider expanding on that thought a little",
      "Add a few more words to give it more substance",
      "This could use a bit more elaboration"
    ],
    need0: [
      "A shorter, punchier post would work better here",
      "Try keeping it brief and to the point",
      "Less is more - trim it down a bit",
      "Make it snappy - shorter works better"
    ]
  },
  media: {
    need1: [
      "Consider sharing an image or link with this post",
      "Adding a photo or link would be perfect here",
      "Try including some media with this one",
      "An image or URL would complement this nicely"
    ],
    need0: [
      "A text-only post would fit better for this message",
      "Pure text works better here - skip the media",
      "Try this one without images or links",
      "Keep it simple - just words this time"
    ]
  },
  qmark: {
    need1: [
      "Try phrasing something as a question?",
      "What if you asked a question here?",
      "Questions work great for this - try one out",
      "Consider turning this into a question"
    ],
    need0: [
      "Statements work better here - save the questions",
      "Make it declarative instead of asking",
      "Drop the question mark for this one",
      "Try stating it rather than asking"
    ]
  }
};

const getRandomTip = (category: keyof typeof TIP_VARIATIONS, variant: 'need0' | 'need1'): string => {
  const tips = TIP_VARIATIONS[category][variant];
  return tips[Math.floor(Math.random() * tips.length)];
};

export const CompositionTips: React.FC<CompositionTipsProps> = ({
  currentBits,
  targetBits,
  onDismiss
}) => {
  const [dismissed, setDismissed] = useState(false);

  if (!targetBits || dismissed) {
    return null;
  }

  // Determine which bits don't match
  const tips: TipVariant[] = [];

  // len bit (index 0)
  if (currentBits[0] !== targetBits[0]) {
    tips.push({
      message: getRandomTip('len', targetBits[0] === 1 ? 'need1' : 'need0'),
      icon: '📏'
    });
  }

  // media bit (index 1)
  if (currentBits[1] !== targetBits[1]) {
    tips.push({
      message: getRandomTip('media', targetBits[1] === 1 ? 'need1' : 'need0'),
      icon: '🖼️'
    });
  }

  // qmark bit (index 2)
  if (currentBits[2] !== targetBits[2]) {
    tips.push({
      message: getRandomTip('qmark', targetBits[2] === 1 ? 'need1' : 'need0'),
      icon: '❓'
    });
  }

  // If all bits match, show success
  if (tips.length === 0) {
    return (
      <div className="composition-tips composition-tips--success">
        <div className="composition-tips__icon">✨</div>
        <div className="composition-tips__content">
          <div className="composition-tips__message">Perfect! This post matches the required pattern.</div>
        </div>
        {onDismiss && (
          <button
            className="composition-tips__dismiss"
            onClick={() => {
              setDismissed(true);
              onDismiss();
            }}
            aria-label="Dismiss tips"
          >
            ×
          </button>
        )}
      </div>
    );
  }

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div className="composition-tips">
      <div className="composition-tips__icon">💡</div>
      <div className="composition-tips__content">
        <div className="composition-tips__title">Composition Tips</div>
        <div className="composition-tips__list">
          {tips.map((tip, index) => (
            <div key={index} className="composition-tips__item">
              <span className="composition-tips__item-icon">{tip.icon}</span>
              <span className="composition-tips__item-message">{tip.message}</span>
            </div>
          ))}
        </div>
        <button className="composition-tips__got-it" onClick={handleDismiss}>
          Got it
        </button>
      </div>
      <button
        className="composition-tips__dismiss"
        onClick={handleDismiss}
        aria-label="Dismiss tips"
      >
        ×
      </button>
    </div>
  );
};
