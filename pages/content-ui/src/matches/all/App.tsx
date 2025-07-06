import { t } from '@extension/i18n';
import { ToggleButton } from '@extension/ui';
import { useEffect, useState } from 'react';

// Define the shape of the highlighter's style state
interface HighlighterStyle {
  display: 'none' | 'block';
  left: string;
  top: string;
  width: string;
  height: string;
}

export default function App() {
  const [highlighterStyle, setHighlighterStyle] = useState<HighlighterStyle>({
    display: 'none',
    left: '0px',
    top: '0px',
    width: '0px',
    height: '0px',
  });

  useEffect(() => {
    const handleShowHighlighter = (event: CustomEvent) => {
      const { rect } = event.detail;
      setHighlighterStyle({
        display: 'block',
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
      });
    };

    const handleHideHighlighter = () => {
      setHighlighterStyle(prevStyle => ({ ...prevStyle, display: 'none' }));
    };

    document.addEventListener('ceb-show-highlighter', handleShowHighlighter as EventListener);
    document.addEventListener('ceb-hide-highlighter', handleHideHighlighter);

    // Cleanup listeners on component unmount
    return () => {
      document.removeEventListener('ceb-show-highlighter', handleShowHighlighter as EventListener);
      document.removeEventListener('ceb-hide-highlighter', handleHideHighlighter);
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  return (
    <>
      {/* Highlighter Element */}
      <div
        style={{
          position: 'absolute',
          backgroundColor: 'rgba(100, 181, 246, 0.3)',
          border: '2px solid #2196F3',
          borderRadius: '3px',
          pointerEvents: 'none',
          zIndex: 2147483647,
          ...highlighterStyle,
        }}
      />

      {/* Original UI */}
      <div className="pointer-events-auto flex items-center justify-between gap-2 rounded bg-white/50 px-2 py-1 backdrop-blur-sm">
        <div className="flex gap-1 text-sm text-blue-500">
          Edit <strong className="text-blue-700">pages/content-ui/src/matches/all/App.tsx</strong> and save to reload.
        </div>
        <ToggleButton className="mt-0 bg-white/50">{t('syncState')}</ToggleButton>
      </div>
    </>
  );
}
