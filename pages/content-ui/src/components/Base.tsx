import { useState, useEffect } from 'react';
import type React from 'react';

export const Base: React.FC<{
  icon: React.ReactNode;
  title: string;
  value: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}> = ({ icon, title, value, onClick, style: additionalStyle }) => {
  const [isDarkMode, setIsDarkMode] = useState(window.matchMedia('(prefers-color-scheme: dark)').matches);
  const [isHovered, setIsHovered] = useState(false);

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
    borderRadius: '8px',
    padding: '2px 4px',
    userSelect: 'none',
    transition: 'transform 0.15s ease-in-out, opacity 0.3s ease-in-out',
    transform: isHovered ? 'translateX(-5px)' : 'translateX(0)',
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
      <div
        style={{
          width: '24px',
          height: '24px',
          marginRight: '2px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        {icon}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: '0.9rem', fontWeight: 600, lineHeight: '1.3' }}>{title}</div>
        <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{value}</div>
      </div>
    </div>
  );
};
