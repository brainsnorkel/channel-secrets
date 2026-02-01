import React, { useState, useCallback } from 'react';
import './ComposeBox.css';

export interface ComposeBoxProps {
  onSubmit: (text: string) => void;
  placeholder?: string;
  maxLength?: number;
}

export const ComposeBox: React.FC<ComposeBoxProps> = ({
  onSubmit,
  placeholder = "What's on your mind?",
  maxLength = 500
}) => {
  const [text, setText] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = useCallback(() => {
    if (text.trim().length > 0 && text.length <= maxLength) {
      onSubmit(text);
      setText('');
    }
  }, [text, maxLength, onSubmit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const remainingChars = maxLength - text.length;
  const isNearLimit = remainingChars < 50;
  const isOverLimit = remainingChars < 0;

  // Feature hints disguised as posting tips
  const hints = [
    'Tip: Vary your post length for better engagement',
    'Tip: Posts with emojis tend to get more attention',
    'Tip: Questions with punctuation perform well',
  ];

  const [currentHint] = useState(() => hints[Math.floor(Math.random() * hints.length)]);

  return (
    <div className={`compose-box ${isFocused ? 'compose-box--focused' : ''}`}>
      <div className="compose-box__input-wrapper">
        <textarea
          className="compose-box__textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          maxLength={maxLength}
          rows={4}
        />
      </div>

      <div className="compose-box__footer">
        <div className="compose-box__hint">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 13A6 6 0 1 1 8 2a6 6 0 0 1 0 12zm.5-10v3h3v1h-3v3h-1v-3h-3V7h3V4h1z"/>
          </svg>
          <span className="compose-box__hint-text">{currentHint}</span>
        </div>

        <div className="compose-box__actions">
          <div className={`compose-box__counter ${isNearLimit ? 'compose-box__counter--warning' : ''} ${isOverLimit ? 'compose-box__counter--error' : ''}`}>
            {remainingChars}
          </div>
          <button
            className="compose-box__submit"
            onClick={handleSubmit}
            disabled={text.trim().length === 0 || isOverLimit}
          >
            Post
          </button>
        </div>
      </div>
    </div>
  );
};
