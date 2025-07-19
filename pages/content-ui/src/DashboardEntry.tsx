import { useState, useEffect } from 'react';
import type React from 'react';

export const DashboardEntry: React.FC<{
  onClick?: () => void;
  style?: React.CSSProperties;
}> = ({ onClick, style: additionalStyle }) => {
  const [isDarkMode, setIsDarkMode] = useState(window.matchMedia('(prefers-color-scheme: dark)').matches);
  const [isHovered, setIsHovered] = useState(false);

  const icon = (
    <img
      src={chrome.runtime.getURL('icon-128.png')}
      alt="RWKV Logo"
      style={{
        width: '32px',
        height: '32px',
        objectFit: 'contain',
        borderRadius: '8px',
      }}
    />
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  const style: React.CSSProperties = {
    pointerEvents: 'auto',
    display: 'flex',
    alignItems: 'center',
    backdropFilter: 'blur(8px)',
    borderTopLeftRadius: '12px',
    borderBottomLeftRadius: '12px',
    padding: '2px 4px',
    userSelect: 'none',
    transition: 'transform 0.15s ease-in-out, opacity 0.3s ease-in-out',
    transform: isHovered ? 'translateX(-5px)' : 'translateX(0)',
    cursor: 'pointer',
    ...(isDarkMode
      ? {
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.5)',
          color: '#fff',
        }
      : {
          backgroundColor: 'rgba(255, 255, 255, 0.5)',
          border: '1px solid rgba(0, 0, 0, 0.5)',
          color: '#111',
        }),
    ...additionalStyle,
  };

  if (onClick) {
    style.pointerEvents = 'auto';
    style.cursor = 'pointer';
  }
  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div
      onClick={onClick}
      style={style}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}>
      {icon}
      <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '4px' }}>
        <div style={{ fontSize: '0.9rem', fontWeight: 600, lineHeight: '1.3' }}>RWKV</div>
        <div style={{ fontSize: '0.9rem', fontWeight: 600, lineHeight: '1.3' }}>离线翻译</div>
      </div>
    </div>
  );
};
