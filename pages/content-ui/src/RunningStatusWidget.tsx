import { BaseWidget } from './BaseWidget';
import { useContentUIState } from './hooks/useContentUIState';
import { FaServer } from 'react-icons/fa';
import type { FC } from 'react';

export const RunningStatusWidget: FC<{
  style?: React.CSSProperties;
}> = ({ style }) => {
  const { running } = useContentUIState();

  return <BaseWidget icon={<FaServer />} title="服务器状态" value={running ? '运行中' : '已停止'} style={style} />;
};
