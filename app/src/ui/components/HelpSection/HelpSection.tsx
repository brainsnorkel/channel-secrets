// Module: ui/components/HelpSection
// Help system with lazy-loaded content sections

import { useState, Suspense, lazy } from 'react';
import { useTestingMode } from '../../context';
import './HelpSection.css';

// Lazy load help content sections
const Overview = lazy(() => import('./content/Overview').then(m => ({ default: m.Overview })));
const Glossary = lazy(() => import('./content/Glossary').then(m => ({ default: m.Glossary })));
const FAQ = lazy(() => import('./content/FAQ').then(m => ({ default: m.FAQ })));
const SecurityModel = lazy(() => import('./content/SecurityModel').then(m => ({ default: m.SecurityModel })));

export type HelpTab = 'overview' | 'glossary' | 'faq' | 'security';

export interface HelpSectionProps {
  /** Initial tab to display */
  initialTab?: HelpTab;
  /** Custom class name */
  className?: string;
  /** Called when user closes help */
  onClose?: () => void;
}

interface TabConfig {
  id: HelpTab;
  label: string;
  stealthLabel: string;
  component: React.LazyExoticComponent<React.ComponentType>;
}

const TABS: TabConfig[] = [
  { id: 'overview', label: 'Overview', stealthLabel: 'Overview', component: Overview },
  { id: 'glossary', label: 'Glossary', stealthLabel: 'Terms', component: Glossary },
  { id: 'faq', label: 'FAQ', stealthLabel: 'FAQ', component: FAQ },
  { id: 'security', label: 'Security Model', stealthLabel: 'Privacy', component: SecurityModel },
];

/**
 * Loading placeholder for lazy-loaded content
 */
function LoadingPlaceholder() {
  return (
    <div className="help-loading">
      <div className="help-loading-spinner" />
      <span>Loading...</span>
    </div>
  );
}

/**
 * Help section component with tabbed navigation.
 *
 * Production mode: Uses stealth labels ("Sync Technical Details")
 * Testing mode: Uses explicit labels ("Help")
 */
export function HelpSection({
  initialTab = 'overview',
  className = '',
  onClose,
}: HelpSectionProps) {
  const testingMode = useTestingMode();
  const [activeTab, setActiveTab] = useState<HelpTab>(initialTab);

  const activeTabConfig = TABS.find(t => t.id === activeTab) || TABS[0];
  const ActiveContent = activeTabConfig.component;

  return (
    <div className={`help-section ${testingMode ? 'testing-mode' : ''} ${className}`}>
      {/* Header */}
      <header className="help-header">
        <h1 className="help-title">
          {testingMode ? 'Help & Documentation' : 'Sync Technical Details'}
        </h1>
        {onClose && (
          <button
            type="button"
            className="help-close-button"
            onClick={onClose}
            aria-label="Close help"
          >
            ×
          </button>
        )}
      </header>

      {/* Tab navigation */}
      <nav className="help-tabs" role="tablist">
        {TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            className={`help-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            aria-selected={activeTab === tab.id}
            aria-controls={`help-panel-${tab.id}`}
          >
            {testingMode ? tab.label : tab.stealthLabel}
          </button>
        ))}
      </nav>

      {/* Content panel */}
      <div
        className="help-panel"
        role="tabpanel"
        id={`help-panel-${activeTab}`}
        aria-labelledby={`help-tab-${activeTab}`}
      >
        <Suspense fallback={<LoadingPlaceholder />}>
          <ActiveContent />
        </Suspense>
      </div>

      {/* Testing mode indicator */}
      {testingMode && (
        <footer className="help-footer">
          <span className="help-testing-badge">TESTING MODE</span>
          <span className="help-spec-link">
            Full specification: SPEC.md
          </span>
        </footer>
      )}
    </div>
  );
}

/**
 * Navigation link for help section.
 * Uses stealth label in production mode.
 */
export interface HelpLinkProps {
  onClick: () => void;
  className?: string;
}

export function HelpLink({ onClick, className = '' }: HelpLinkProps) {
  const testingMode = useTestingMode();

  return (
    <button
      type="button"
      className={`help-link ${testingMode ? 'testing-mode' : ''} ${className}`}
      onClick={onClick}
    >
      {testingMode ? 'Help' : 'Sync Technical Details'}
    </button>
  );
}

/**
 * Prominent header link for testing mode.
 */
export function HelpHeaderLink({ onClick, className = '' }: HelpLinkProps) {
  const testingMode = useTestingMode();

  // Only show in testing mode
  if (!testingMode) {
    return null;
  }

  return (
    <button
      type="button"
      className={`help-header-link ${className}`}
      onClick={onClick}
    >
      <span className="help-header-link-icon">?</span>
      <span className="help-header-link-text">Help</span>
    </button>
  );
}
