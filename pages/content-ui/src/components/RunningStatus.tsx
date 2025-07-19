import { Base } from './Base';
import { useContentUIState } from '../hooks/useContentUIState';
import { FaServer } from 'react-icons/fa';
import type { FC } from 'react';

export const RunningStatus: FC<{
  style?: React.CSSProperties;
}> = ({ style }) => {
  const { running } = useContentUIState();

  return <Base icon={<FaServer />} title="服务器状态" value={running ? '运行中' : '已停止'} style={style} />;
};
