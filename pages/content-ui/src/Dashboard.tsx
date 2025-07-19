import {
  BBox,
  DemoMode,
  DiagnoseMode,
  IgnoredStatus,
  InteractionMode,
  RunningStatus,
  FeedbackButton,
} from './components';
import { DashboardEntry } from './DashboardEntry';
import { useContentUIState } from './hooks/useContentUIState';
import { useFullscreenDetection } from './hooks/useFullscreenDetection';
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

  // 全屏检测
  const isFullscreen = useFullscreenDetection();

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
    // 全屏时隐藏 Dashboard
    opacity: isFullscreen ? 0 : 1,
    visibility: isFullscreen ? 'hidden' : 'visible',
    transition: 'opacity 0.2s ease-out, visibility 0.2s ease-out',
  };

  const widgetAnimationStyle = {
    transform: shouldShowOthers ? 'translateX(0)' : 'translateX(100%)',
    opacity: shouldShowOthers ? 1 : 0,
    transition: 'transform 0.1s ease-out, opacity 0.1s ease-out',
  };

  // 如果处于全屏模式，不渲染 Dashboard
  if (isFullscreen) {
    return null;
  }

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
        <RunningStatus style={widgetAnimationStyle} />
        <IgnoredStatus style={widgetAnimationStyle} />
        {/* <InteractionMode style={widgetAnimationStyle} />
        <DemoMode style={widgetAnimationStyle} /> */}
        <DiagnoseMode style={widgetAnimationStyle} />
        <BBox style={widgetAnimationStyle} />
        <FeedbackButton style={widgetAnimationStyle} />
      </div>
    </div>
  );
};
