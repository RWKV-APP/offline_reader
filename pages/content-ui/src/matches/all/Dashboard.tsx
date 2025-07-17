import { ignoreHref } from '@extension/shared';
import { useState, useEffect } from 'react';
import { FaPlay, FaStop, FaEye, FaEyeSlash, FaMousePointer, FaExpand, FaBan, FaDesktop } from 'react-icons/fa';
import type React from 'react';

// --- Status Item Component ---
const StatusItem: React.FC<{ icon: React.ReactNode; title: string; value: string }> = ({ icon, title, value }) => (
  <div style={{ display: 'flex', alignItems: 'center' }}>
    <div
      style={{
        width: '24px',
        height: '24px',
        marginRight: '12px',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {icon}
    </div>
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
        return <FaMousePointer />;
      case 'full':
        return <FaExpand />;
      default:
        return <FaBan />;
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
      <StatusItem icon={running ? <FaPlay /> : <FaStop />} title="Running" value={running ? 'Active' : 'Inactive'} />
      <StatusItem icon={ignored ? <FaEyeSlash /> : <FaEye />} title="Ignored Page" value={ignored ? 'Yes' : 'No'} />
      <StatusItem icon={getInteractionModeIcon()} title="Interaction" value={interactionMode ?? 'None'} />
      <StatusItem icon={<FaDesktop />} title="Demo Mode" value={demoMode ? 'On' : 'Off'} />
    </div>
  );
};
