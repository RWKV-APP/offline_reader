import { useEffect, useState, useCallback } from 'react';
import type { ElementPosition } from '@extension/shared';

interface BBoxRendererProps {
  enabled: boolean;
}

interface BBoxStyle {
  left: number;
  top: number;
  width: number;
  height: number;
  borderColor: string;
  backgroundColor: string;
  zIndex: number;
}

const getBBoxStyle = (position: ElementPosition): BBoxStyle => {
  const baseZIndex = 2147483646; // 仅次于最高层级

  const styles = {
    target: {
      borderColor: 'rgba(0, 255, 255, 0.8)',
      backgroundColor: 'rgba(0, 255, 255, 0.1)',
      zIndex: baseZIndex,
    },
    result: {
      borderColor: 'rgba(0, 255, 0, 0.8)',
      backgroundColor: 'rgba(0, 255, 0, 0.1)',
      zIndex: baseZIndex + 1,
    },
    spinner: {
      borderColor: 'rgba(255, 165, 0, 0.8)',
      backgroundColor: 'rgba(255, 165, 0, 0.1)',
      zIndex: baseZIndex + 2,
    },
    done: {
      borderColor: 'rgba(0, 0, 255, 0.8)',
      backgroundColor: 'rgba(0, 0, 255, 0.1)',
      zIndex: baseZIndex + 3,
    },
  };

  const style = styles[position.type];

  return {
    left: position.rect.left,
    top: position.rect.top,
    width: position.rect.width,
    height: position.rect.height,
    ...style,
  };
};

export const BBoxRenderer: React.FC<BBoxRendererProps> = ({ enabled }) => {
  const [positions, setPositions] = useState<ElementPosition[]>([]);

  const handlePositionSync = useCallback(
    (event: CustomEvent) => {
      const { positions: newPositions } = event.detail;

      // 性能优化：只在位置真正变化时更新状态
      setPositions(prevPositions => {
        if (prevPositions.length !== newPositions.length) {
          return newPositions;
        }

        // 检查是否有位置变化
        for (let i = 0; i < newPositions.length; i++) {
          const newPos = newPositions[i];
          const prevPos = prevPositions[i];

          if (
            !prevPos ||
            newPos.id !== prevPos.id ||
            newPos.rect.left !== prevPos.rect.left ||
            newPos.rect.top !== prevPos.rect.top ||
            newPos.rect.width !== prevPos.rect.width ||
            newPos.rect.height !== prevPos.rect.height
          ) {
            return newPositions;
          }
        }

        return prevPositions; // 没有变化，返回之前的状态
      });
    },
    [enabled],
  );

  useEffect(() => {
    if (!enabled) {
      setPositions([]);
      return;
    }

    document.addEventListener('ceb-position-sync', handlePositionSync as EventListener);

    return () => {
      document.removeEventListener('ceb-position-sync', handlePositionSync as EventListener);
      // 清理位置缓存
      setPositions([]);
    };
  }, [enabled, handlePositionSync]);

  if (!enabled || positions.length === 0) return null;

  return (
    <>
      {positions.map((position, index) => {
        const style = getBBoxStyle(position);

        return (
          <div
            key={`${position.id}-${index}`}
            className="pointer-events-none absolute"
            style={{
              left: style.left,
              top: style.top,
              width: style.width,
              height: style.height,
              borderColor: style.borderColor,
              backgroundColor: style.backgroundColor,
              zIndex: style.zIndex,
              borderRadius: '2px',
              // transition: 'all 0.1s',
              // 确保边框可见
              borderWidth: '1px',
              borderStyle: 'solid',
            }}
            title={`${position.type}: ${position.text.slice(0, 50)}${position.text.length > 50 ? '...' : ''}`}
          />
        );
      })}
    </>
  );
};
