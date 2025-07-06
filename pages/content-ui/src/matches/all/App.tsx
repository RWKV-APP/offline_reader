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
    <div
      className="pointer-events-none absolute border border-blue-500 bg-blue-500/10"
      style={{
        zIndex: 2147483647,
        ...highlighterStyle,
      }}
    />
  );
}
