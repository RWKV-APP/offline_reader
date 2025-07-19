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
      icon={<FaBug />}
      title="诊断模式"
      value={inspecting ? '是' : '否'}
      onClick={toggleDiagnoseMode}
      style={style}
    />
  );
};
