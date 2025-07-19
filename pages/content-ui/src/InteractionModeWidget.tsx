import { BaseWidget } from './BaseWidget';
import { useContentUIState } from './hooks/useContentUIState';
import { FaMousePointer, FaExpand, FaBan } from 'react-icons/fa';
import type { FC } from 'react';

export const InteractionModeWidget: FC<{
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
    <BaseWidget
      icon={getInteractionModeIcon()}
      title="交互模式"
      value="未实现"
      onClick={toggleInteractionMode}
      style={style}
    />
  );
};
