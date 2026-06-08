import { Base } from './Base';
import { useStorage } from '@extension/shared';
import { engineStatusStorage } from '@extension/storage';
import { FaServer } from 'react-icons/fa';
import type { FC } from 'react';

export const RunningStatus: FC<{
  style?: React.CSSProperties;
}> = ({ style }) => {
  const engineStatus = useStorage(engineStatusStorage);
  const isReady = engineStatus.connected && engineStatus.models.length > 0;
  const value = isReady ? '已连接' : engineStatus.connected ? '未加载模型' : '未连接';

  return (
    <Base
      icon={<FaServer style={{ color: isReady ? '#22c55e' : engineStatus.connected ? '#f59e0b' : undefined }} />}
      title="服务器状态"
      value={value}
      style={style}
    />
  );
};
