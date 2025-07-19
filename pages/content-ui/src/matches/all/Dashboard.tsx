import { SideButton } from './SideButton';
import { ignoreHref } from '@extension/shared';
import { useState, useEffect } from 'react';
import { FaPlay, FaStop, FaEye, FaEyeSlash, FaMousePointer, FaExpand, FaBan, FaDesktop, FaBug } from 'react-icons/fa';
import type { SetState } from '@extension/shared';
import type React from 'react';

export const Dashboard: React.FC = () => {
  // 是否运行中, websocket 是否处于链接状态?
  const [running, setRunning] = useState(false);
  // 页面是否被忽略
  const [ignored, setIgnored] = useState(false);
  // 页面交互模式
  const [interactionMode, setInteractionMode] = useState<'hover' | 'full'>('hover');
  // 演示模式
  const [demoMode, setDemoMode] = useState(false);
  // 是否显示其他状态项
  const [hoverd, setHoverd] = useState(false);
  // 是否正在hover其他状态项
  const [hoveringOthers, setHoveringOthers] = useState(false);

  const [inspecting, setInspecting] = useState(false);

  useEffect(() => {
    const handleRunningUpdate = (event: CustomEvent) => {
      setRunning(event.detail.running);
      setIgnored(ignoreHref.some(href => window.location.href.startsWith(href)));
      setInteractionMode(event.detail.interactionMode);
      setDemoMode(event.detail.demoMode);
      setInspecting(event.detail.inspecting);
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
      inspecting: !inspecting,
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

  const dashboardStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 0,
    right: 0,
    top: 0,
    zIndex: 2147483647,
    pointerEvents: 'none',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
    gap: '4px',
    userSelect: 'none',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  };

  // 计算是否应该显示其他状态项
  const shouldShowOthers = hoverd || hoveringOthers;

  return (
    <div style={dashboardStyle}>
      <div onMouseEnter={() => setHoverd(true)} onMouseLeave={() => setHoverd(false)}>
        <SideButton
          icon={running ? <FaPlay /> : <FaStop />}
          title="??"
          value={running ? '运行中' : '未运行'}
          style={{
            transform: shouldShowOthers || hoverd ? 'translateX(0)' : 'translateX(67%)',
            opacity: shouldShowOthers || hoverd ? 1 : 0.5,
            transition: 'transform 0.1s ease-out, opacity 0.1s ease-out',
          }}
        />
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          pointerEvents: shouldShowOthers ? 'auto' : 'none',
        }}
        onMouseEnter={() => setHoveringOthers(true)}
        onMouseLeave={() => setHoveringOthers(false)}>
        <SideButton
          icon={ignored ? <FaEyeSlash /> : <FaEye />}
          title="页面被忽略了"
          value={ignored ? '是' : '否'}
          style={{
            transform: shouldShowOthers ? 'translateX(0)' : 'translateX(100%)',
            opacity: shouldShowOthers ? 1 : 0,
            transition: 'transform 0.1s ease-out, opacity 0.1s ease-out',
          }}
        />
        <SideButton
          icon={getInteractionModeIcon()}
          title="交互模式"
          value={'未实现'}
          onClick={toggleInteractionMode}
          style={{
            transform: shouldShowOthers ? 'translateX(0)' : 'translateX(100%)',
            opacity: shouldShowOthers ? 1 : 0,
            transition: 'transform 0.1s ease-out, opacity 0.1s ease-out',
          }}
        />
        <SideButton
          icon={<FaDesktop />}
          title="演示模式"
          value={'未实现'}
          onClick={toggleDemoMode}
          style={{
            transform: shouldShowOthers ? 'translateX(0)' : 'translateX(100%)',
            opacity: shouldShowOthers ? 1 : 0,
            transition: 'transform 0.1s ease-out, opacity 0.1s ease-out',
          }}
        />
        <SideButton
          icon={<FaBug />}
          title="诊断模式"
          value={inspecting ? '是' : '否'}
          onClick={toggleDiagnoseMode}
          style={{
            transform: shouldShowOthers ? 'translateX(0)' : 'translateX(100%)',
            opacity: shouldShowOthers ? 1 : 0,
            transition: 'transform 0.1s ease-out, opacity 0.1s ease-out',
          }}
        />
      </div>
    </div>
  );
};
