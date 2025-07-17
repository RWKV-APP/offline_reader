import { ignoreHref } from '@extension/shared';
import { useState, useEffect } from 'react';
import { FaPlay, FaStop, FaEye, FaEyeSlash, FaMousePointer, FaExpand, FaBan, FaDesktop, FaBug } from 'react-icons/fa';
import type { SetState } from '@extension/shared';
import type React from 'react';

// --- Status Item Component ---
const StatusItem: React.FC<{ icon: React.ReactNode; title: string; value: string; onClick?: () => void }> = ({
  icon,
  title,
  value,
  onClick,
}) => {
  const style: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 245, 245, 0.85)',
    backdropFilter: 'blur(8px)',
  };

  if (onClick) {
    style.pointerEvents = 'auto';
    style.cursor = 'pointer';
  }
  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div onClick={onClick} style={style}>
      <div
        style={{
          width: '24px',
          height: '24px',
          marginRight: '2px',
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
};

export const Dashboard: React.FC = () => {
  // 是否运行中, websocket 是否处于链接状态?
  const [running, setRunning] = useState(false);
  // 页面是否被忽略
  const [ignored, setIgnored] = useState(false);
  // 页面交互模式
  const [interactionMode, setInteractionMode] = useState<'hover' | 'full'>('hover');
  // 演示模式
  const [demoMode, setDemoMode] = useState(false);

  const [diagnoseMode, setDiagnoseMode] = useState(false);

  useEffect(() => {
    const handleRunningUpdate = (event: CustomEvent) => {
      setRunning(event.detail.running);
      setIgnored(ignoreHref.some(href => window.location.href.startsWith(href)));
      setInteractionMode(event.detail.interactionMode);
      setDemoMode(event.detail.demoMode);
      setDiagnoseMode(event.detail.diagnoseMode);
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

  const toggleInteractionMode = () => {
    const modes: (typeof interactionMode)[] = ['hover', 'full'];
    const currentIndex = modes.indexOf(interactionMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    const newMode = modes[nextIndex];
    const msg: SetState = {
      func: 'SetState',
      inspecting: false,
      demoMode: demoMode,
      interactionMode: newMode,
    };
    chrome.runtime.sendMessage(msg);
  };

  const toggleDiagnoseMode = () => {
    const msg: SetState = {
      func: 'SetState',
      interactionMode: interactionMode ?? 'hover',
      demoMode: demoMode,
      inspecting: false,
    };
    chrome.runtime.sendMessage(msg);
  };

  const toggleDemoMode = () => {
    const msg: SetState = {
      func: 'SetState',
      interactionMode: interactionMode ?? 'hover',
      demoMode: !demoMode,
      inspecting: false,
    };
    chrome.runtime.sendMessage(msg);
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
        icon={running ? <FaPlay /> : <FaStop />}
        title="RWKV 运行状态"
        value={running ? '运行中' : '未运行'}
      />
      <StatusItem icon={ignored ? <FaEyeSlash /> : <FaEye />} title="页面被忽略了" value={ignored ? '是' : '否'} />
      <StatusItem
        icon={getInteractionModeIcon()}
        title="交互模式"
        value={interactionMode ?? 'None'}
        onClick={toggleInteractionMode}
      />
      <StatusItem icon={<FaDesktop />} title="演示模式" value={demoMode ? '是' : '否'} onClick={toggleDemoMode} />
      <StatusItem icon={<FaBug />} title="诊断模式" value={diagnoseMode ? '是' : '否'} onClick={toggleDiagnoseMode} />
    </div>
  );
};
