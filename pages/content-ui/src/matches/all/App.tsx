import { useEffect, useState } from 'react';

// Define the shape of the highlighter's style state
interface HighlighterStyle {
  display: 'none' | 'block';
  left: number;
  top: number;
  width: number;
  height: number;
}

export default function App() {
  const [highlighterStyle, setHighlighterStyle] = useState<HighlighterStyle>({
    display: 'none',
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  });
  const [text, setText] = useState('');
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    const handleShowHighlighter = (event: CustomEvent) => {
      const { rect, text: newText } = event.detail;
      setHighlighterStyle({
        display: 'block',
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      });
      setText(newText);
    };

    const handleHideHighlighter = () => {
      setHighlighterStyle(prevStyle => ({ ...prevStyle, display: 'none' }));
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Shift' && event.location === KeyboardEvent.DOM_KEY_LOCATION_RIGHT) {
        setShowText(true);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Shift') {
        setShowText(false);
      }
    };

    document.addEventListener('ceb-show-highlighter', handleShowHighlighter as EventListener);
    document.addEventListener('ceb-hide-highlighter', handleHideHighlighter);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Cleanup listeners on component unmount
    return () => {
      document.removeEventListener('ceb-show-highlighter', handleShowHighlighter as EventListener);
      document.removeEventListener('ceb-hide-highlighter', handleHideHighlighter);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  const left = highlighterStyle.left;
  const top = highlighterStyle.top;
  const windowHeight = window.innerHeight;
  const bottom = windowHeight - top;
  const width = highlighterStyle.width;
  const padding = 8;

  // TODO: 顶部溢出

  return (
    <>
      <div
        className="pointer-events-none absolute border border-blue-500 bg-blue-500/10"
        style={{
          zIndex: 2147483647,
          ...highlighterStyle,
        }}
      />
      {showText && (
        <div
          className="pointer-events-none absolute flex items-end p-1 text-white"
          style={{
            backdropFilter: `blur(${padding}px)`,
            padding: '0.5rem',
            borderRadius: '0.5rem',
            zIndex: 2147483647,
            left: left - padding,
            bottom,
            width: width + padding * 2,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.5)',
          }}>
          {text}
        </div>
      )}
    </>
  );
}
