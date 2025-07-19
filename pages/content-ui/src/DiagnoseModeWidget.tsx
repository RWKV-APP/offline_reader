import { BaseWidget } from './BaseWidget';
import { useContentUIState } from './hooks/useContentUIState';
import { FaBug } from 'react-icons/fa';
import type { FC } from 'react';

export const DiagnoseModeWidget: FC<{
  style?: React.CSSProperties;
}> = ({ style }) => {
  const { inspecting, toggleDiagnoseMode } = useContentUIState();

  return (
    <BaseWidget
      icon={<FaBug style={{ color: inspecting ? '#ff6b6b' : undefined }} />}
      title="DOM 诊断模式"
      value={inspecting ? '已开启' : '已关闭'}
      onClick={toggleDiagnoseMode}
      style={{
        ...style,
        // 当诊断模式开启时，添加特殊样式
        ...(inspecting && {
          border: '2px solid #ff6b6b',
          backgroundColor: 'rgba(255, 107, 107, 0.1)',
        }),
      }}
    />
  );
};
