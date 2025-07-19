import { Base } from './Base';
import { useContentUIState } from '../hooks/useContentUIState';
import { FaEye } from 'react-icons/fa';
import type { FC } from 'react';

export const BBox: FC<{
  style?: React.CSSProperties;
}> = ({ style }) => {
  const { showBBox, toggleBBox, debug } = useContentUIState();

  // 调试信息
  console.log('BBox: 状态', { showBBox, debug });

  const handleClick = () => {
    console.log('BBox: 点击事件触发', { currentState: showBBox });
    toggleBBox();
  };

  return (
    <Base
      icon={<FaEye style={{ color: showBBox ? '#00ff00' : undefined }} />}
      title="HUD 诊断模式"
      value={showBBox ? '已开启' : '已关闭'}
      onClick={handleClick}
      style={{
        ...style,
        // 当HUD诊断模式开启时，添加特殊样式
        ...(showBBox && {
          border: '2px solid #00ff00',
          backgroundColor: 'rgba(0, 255, 0, 0.1)',
        }),
      }}
    />
  );
};
