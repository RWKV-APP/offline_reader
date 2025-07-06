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
  const [text, setText] = useState('');
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    const handleShowHighlighter = (event: CustomEvent) => {
      const { rect, text: newText } = event.detail;
      setHighlighterStyle({
        display: 'block',
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
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
          className="pointer-events-none absolute rounded bg-black p-1 text-white"
          style={{
            zIndex: 2147483647,
            left: highlighterStyle.left,
            top: `calc(${highlighterStyle.top} - 2.5rem)`,
          }}>
          {text}
        </div>
      )}
    </>
  );
}
