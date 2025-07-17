import { ignoreHref } from '@extension/shared';
import { useState, useEffect } from 'react';
import type React from 'react';

// --- Icon Components ---
const PlayIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3"></polygon>
  </svg>
);

const StopIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
  </svg>
);

const EyeIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

const EyeOffIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
    <line x1="1" y1="1" x2="23" y2="23"></line>
  </svg>
);

const MousePointerIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <path d="m3 3 7.07 16.97 2.52-7.39 7.39-2.52L3 3z"></path>
    <path d="m13 13 6 6"></path>
  </svg>
);

const MaximizeIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
  </svg>
);

const BanIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
  </svg>
);

const PresentationIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <path d="M2 3h20v14H2z"></path>
    <path d="M12 17v4"></path>
    <path d="M8 21h8"></path>
  </svg>
);

// --- Status Item Component ---
const StatusItem: React.FC<{ icon: React.ReactNode; title: string; value: string }> = ({ icon, title, value }) => (
  <div style={{ display: 'flex', alignItems: 'center' }}>
    <div style={{ width: '24px', height: '24px', marginRight: '12px', flexShrink: 0 }}>{icon}</div>
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: '0.9rem', fontWeight: 600, lineHeight: '1.3' }}>{title}</div>
      <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{value}</div>
    </div>
  </div>
);

export const Dashboard: React.FC = () => {
  // 是否运行中, websocket 是否处于链接状态?
  const [running, setRunning] = useState(false);
  // 页面是否被忽略
  const [ignored, setIgnored] = useState(false);
  // 页面交互模式
  const [interactionMode, setInteractionMode] = useState<'hover' | 'full' | null>(null);
  // 演示模式
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    const handleRunningUpdate = (event: CustomEvent) => {
      setRunning(event.detail.running);
      setIgnored(ignoreHref.some(href => window.location.href.startsWith(href)));
      setInteractionMode(event.detail.interactionMode);
      setDemoMode(event.detail.demoMode);
    };

    document.addEventListener('state-changed', handleRunningUpdate as EventListener);

    return () => {
      document.removeEventListener('state-changed', handleRunningUpdate as EventListener);
    };
  }, []);

  useEffect(() => {
    chrome.runtime.sendMessage({ func: 'GetState' });
  }, []);

  const getInteractionModeIcon = () => {
    switch (interactionMode) {
      case 'hover':
        return <MousePointerIcon />;
      case 'full':
        return <MaximizeIcon />;
      default:
        return <BanIcon />;
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        top: 0,
        width: 180,
        zIndex: 2147483647,
        pointerEvents: 'none',
        backgroundColor: 'rgba(245, 245, 245, 0.85)',
        backdropFilter: 'blur(8px)',
        borderRight: '1px solid rgba(0, 0, 0, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '20px',
        gap: '20px',
        color: '#111',
      }}>
      <StatusItem
        icon={running ? <PlayIcon /> : <StopIcon />}
        title="Running"
        value={running ? 'Active' : 'Inactive'}
      />
      <StatusItem icon={ignored ? <EyeOffIcon /> : <EyeIcon />} title="Ignored Page" value={ignored ? 'Yes' : 'No'} />
      <StatusItem icon={getInteractionModeIcon()} title="Interaction" value={interactionMode ?? 'None'} />
      <StatusItem icon={<PresentationIcon />} title="Demo Mode" value={demoMode ? 'On' : 'Off'} />
    </div>
  );
};
