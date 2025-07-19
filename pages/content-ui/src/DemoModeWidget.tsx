import { BaseWidget } from './BaseWidget';
import { useContentUIState } from './hooks/useContentUIState';
import { FaDesktop } from 'react-icons/fa';
import type { FC } from 'react';

export const DemoModeWidget: FC<{
  style?: React.CSSProperties;
}> = ({ style }) => {
  const { toggleDemoMode } = useContentUIState();

  return <BaseWidget icon={<FaDesktop />} title="演示模式" value="未实现" onClick={toggleDemoMode} style={style} />;
};
