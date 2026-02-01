import { useState, useRef, useEffect } from 'react';
import type { ReactNode, KeyboardEvent } from 'react';
import { useTestingMode } from '../../context';
import { getTooltipContent } from './tooltipRegistry';
import type { TooltipId } from './tooltipRegistry';
import './Tooltip.css';

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipProps {
  /** Tooltip ID from registry */
  id: TooltipId;
  /** Element that the tooltip describes */
  children: ReactNode;
  /** Popover placement relative to trigger */
  placement?: TooltipPlacement;
  /** Custom class for the wrapper */
  className?: string;
}

/**
 * Tooltip component with progressive disclosure.
 *
 * Production mode: Shows (?) icon, click to reveal short text, "Learn more" expands.
 * Testing mode: Shows full long text inline without interaction.
 *
 * Keyboard accessible: Tab to focus, Enter/Space to activate, Escape to close.
 */
export function Tooltip({
  id,
  children,
  placement = 'top',
  className = '',
}: TooltipProps) {
  const testingMode = useTestingMode();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const content = getTooltipContent(id);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setIsExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setIsExpanded(false);
      triggerRef.current?.focus();
    }
  };

  const handleTriggerClick = () => {
    setIsOpen(!isOpen);
    if (isOpen) {
      setIsExpanded(false);
    }
  };

  const handleTriggerKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleTriggerClick();
    } else if (e.key === 'Escape' && isOpen) {
      setIsOpen(false);
      setIsExpanded(false);
    }
  };

  const handleLearnMore = () => {
    setIsExpanded(true);
  };

  // If no content found, render children without tooltip
  if (!content) {
    return <>{children}</>;
  }

  // Testing mode: inline display
  if (testingMode) {
    return (
      <span className={`tooltip-wrapper tooltip-testing ${className}`}>
        {children}
        <span className="tooltip-inline" role="note" aria-label={content.long}>
          <span className="tooltip-inline-text">{content.long}</span>
          {content.specRef && (
            <span className="tooltip-spec-ref">SPEC.md {content.specRef}</span>
          )}
        </span>
      </span>
    );
  }

  // Production mode: interactive popover
  return (
    <span className={`tooltip-wrapper ${className}`}>
      {children}
      <button
        ref={triggerRef}
        type="button"
        className="tooltip-trigger"
        onClick={handleTriggerClick}
        onKeyDown={handleTriggerKeyDown}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label="More information"
      >
        <span className="tooltip-icon" aria-hidden="true">(?)</span>
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          className={`tooltip-popover tooltip-popover-${placement}`}
          role="dialog"
          aria-modal="false"
          aria-label="Tooltip"
          onKeyDown={handleKeyDown}
        >
          <div className="tooltip-content">
            {isExpanded ? (
              <>
                <p className="tooltip-long">{content.long}</p>
                {content.specRef && (
                  <p className="tooltip-spec-ref">See SPEC.md {content.specRef}</p>
                )}
              </>
            ) : (
              <>
                <p className="tooltip-short">{content.short}</p>
                <button
                  type="button"
                  className="tooltip-learn-more"
                  onClick={handleLearnMore}
                >
                  Learn more
                </button>
              </>
            )}
          </div>
          <button
            type="button"
            className="tooltip-close"
            onClick={() => {
              setIsOpen(false);
              setIsExpanded(false);
              triggerRef.current?.focus();
            }}
            aria-label="Close tooltip"
          >
            ×
          </button>
        </div>
      )}
    </span>
  );
}
