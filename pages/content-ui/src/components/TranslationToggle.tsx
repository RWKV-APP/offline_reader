import { Base } from './Base';
import { useContentUIState } from '../hooks/useContentUIState';
import { useStorage } from '@extension/shared';
import { engineStatusStorage } from '@extension/storage';
import { FaLanguage } from 'react-icons/fa';
import type { FC } from 'react';

export const TranslationToggle: FC<{
  style?: React.CSSProperties;
}> = ({ style }) => {
  const { translationEnabled, running, toggleTranslationEnabled } = useContentUIState();
  const engineStatus = useStorage(engineStatusStorage);
  const hasModels = engineStatus.models.length > 0;

  const value = !translationEnabled
    ? '已关闭'
    : !engineStatus.connected
      ? '等待服务'
      : !hasModels
        ? '等待模型'
        : running
          ? '翻译中'
          : '待命';
  const accentColor = running ? '#22c55e' : translationEnabled ? '#f59e0b' : '#9ca3af';

  return (
    <Base
      icon={<FaLanguage style={{ color: accentColor }} />}
      title="网页翻译"
      value={value}
      onClick={toggleTranslationEnabled}
      style={{
        ...style,
        border: `2px solid ${accentColor}`,
        backgroundColor: running
          ? 'rgba(34, 197, 94, 0.1)'
          : translationEnabled
            ? 'rgba(245, 158, 11, 0.1)'
            : 'rgba(156, 163, 175, 0.1)',
      }}
    />
  );
};
