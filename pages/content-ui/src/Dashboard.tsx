import { DashboardEntry } from './DashboardEntry';
import { DemoModeWidget } from './DemoModeWidget';
import { DiagnoseModeWidget } from './DiagnoseModeWidget';
import { useContentUIState } from './hooks/useContentUIState';
import { IgnoredStatusWidget } from './IgnoredStatusWidget';
import { InteractionModeWidget } from './InteractionModeWidget';
import { RunningStatusWidget } from './RunningStatusWidget';
import { useCallback } from 'react';
import type { FC } from 'react';

export const Dashboard: FC = () => {
  const {
    // 状态
    hovered,
    shouldShowOthers,
    running,
    inspecting, // 添加缺失的 inspecting 状态
    // 操作方法
    setHovered,
    setHoveringOthers,
  } = useContentUIState();

  // 简化的事件处理 - 确保状态互斥
  const handleEntryMouseEnter = useCallback(() => {
    setHovered(true);
    setHoveringOthers(false); // 确保互斥
  }, [setHovered, setHoveringOthers]);

  const handleEntryMouseLeave = useCallback(() => {
    setHovered(false);
  }, [setHovered]);

  const handleOthersMouseEnter = useCallback(() => {
    setHovered(false); // 确保互斥
    setHoveringOthers(true);
  }, [setHovered, setHoveringOthers]);

  const handleOthersMouseLeave = useCallback(() => {
    setHoveringOthers(false);
  }, [setHoveringOthers]);

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
    justifyContent: 'flex-start',
    paddingTop: '10%',
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
    userSelect: 'none',
    // backgroundColor: 'rgba(0, 0, 0, 0.1)',
  };

  const widgetAnimationStyle = {
    transform: shouldShowOthers ? 'translateX(0)' : 'translateX(100%)',
    opacity: shouldShowOthers ? 1 : 0,
    transition: 'transform 0.1s ease-out, opacity 0.1s ease-out',
  };

  return (
    <div style={dashboardStyle}>
      <div onMouseEnter={handleEntryMouseEnter} onMouseLeave={handleEntryMouseLeave}>
        <DashboardEntry
          style={{
            transform: shouldShowOthers || hovered ? 'translateX(0)' : 'translateX(67%)',
            opacity: shouldShowOthers || hovered ? 1 : 0.5,
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
          paddingTop: '4px',
        }}
        onMouseEnter={handleOthersMouseEnter}
        onMouseLeave={handleOthersMouseLeave}>
        <RunningStatusWidget style={widgetAnimationStyle} />
        <IgnoredStatusWidget style={widgetAnimationStyle} />
        <InteractionModeWidget style={widgetAnimationStyle} />
        <DemoModeWidget style={widgetAnimationStyle} />
        <DiagnoseModeWidget style={widgetAnimationStyle} />
      </div>
    </div>
  );
};
