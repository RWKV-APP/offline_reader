import { Base } from './Base';
import { useContentUIState } from '../hooks/useContentUIState';
import { FaMousePointer, FaExpand, FaBan } from 'react-icons/fa';
import type { FC } from 'react';

export const InteractionMode: FC<{
  style?: React.CSSProperties;
}> = ({ style }) => {
  const { interactionMode, toggleInteractionMode } = useContentUIState();

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

  return (
    <Base
      icon={getInteractionModeIcon()}
      title="交互模式"
      value="未实现"
      onClick={toggleInteractionMode}
      style={style}
    />
  );
};
