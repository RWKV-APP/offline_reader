import { BaseWidget } from './BaseWidget';
import { useContentUIState } from './hooks/useContentUIState';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import type { FC } from 'react';

export const IgnoredStatusWidget: FC<{
  style?: React.CSSProperties;
}> = ({ style }) => {
  const { ignored } = useContentUIState();

  return (
    <BaseWidget
      icon={ignored ? <FaEyeSlash /> : <FaEye />}
      title="页面被忽略了"
      value={ignored ? '是' : '否'}
      style={style}
    />
  );
};
