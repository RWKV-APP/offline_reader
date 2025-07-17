import { formatQueryText, formatTranslation, ignoreHref, queryWS } from '@extension/shared';
import { useEffect, useState } from 'react';
import type React from 'react';

// Define the shape of the highlighter's style state
interface HighlighterStyle {
  display: 'none' | 'block';
  left: number;
  top: number;
  width: number;
  height: number;
}

const RWKVNotification: React.FC = () => {
  const currentHref = window.location.href;
  for (const href of ignoreHref) {
    if (currentHref.startsWith(href)) return null;
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 'auto',
        left: 32,
        bottom: 32,
        width: 'auto',
        height: 'auto',
        fontSize: '4rem',
        lineHeight: 1,
        backgroundColor: 'rgba(0, 0, 0, 1)',
        padding: '0.5rem',
        transition: 'opacity 0.3s ease-in-out',
        cursor: 'pointer',
        zIndex: 2147483647, // 确保在最顶层
        color: 'white', // 确保文字可见
        pointerEvents: 'none',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.opacity = '0.1';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.opacity = '1';
      }}>
      RWKV 离线翻译
      <div style={{ fontSize: '2rem', lineHeight: 1 }}>无需联网即可使用 AI 进行翻译任务</div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  // 是否运行中, websocket 是否处于链接状态?
  const [running, setRunning] = useState(false);
  // 页面是否被忽略
  const [ignored, setIgnored] = useState(false);
  // 页面交互模式
  const [interactionMode, setInteractionMode] = useState<'hover' | 'full' | null>(null);
  // 演示模式
  const [demoMode, setDemoMode] = useState(false);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        right: 200,
        top: 0,
        width: 200,
        zIndex: 2147483647,
        pointerEvents: 'none',
        backgroundColor: 'rgba(255, 0, 0, 0.5)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.5rem',
        lineHeight: 1,
      }}>
      <div style={{ fontSize: '2rem' }}>Running</div>
      <div>{running ? 'Yes' : 'No'}</div>

      <div style={{ height: 12 }} />

      <div style={{ fontSize: '2rem' }}>Ignored</div>
      <div>{ignored ? 'Yes' : 'No'}</div>

      <div style={{ height: 12 }} />

      <div style={{ fontSize: '2rem' }}>Interaction Mode</div>
      <div>{interactionMode ?? 'None'}</div>

      <div style={{ height: 12 }} />

      <div style={{ fontSize: '2rem' }}>演示模式</div>
      <div>{demoMode ? 'Yes' : 'No'}</div>
    </div>
  );
};

export default function App() {
  const [highlighterStyle, setHighlighterStyle] = useState<HighlighterStyle>({
    display: 'none',
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  });

  const [text, setText] = useState('');
  const [translation, setTranslation] = useState('');
  const [showText, setShowText] = useState(false);
  const [isRightShiftPressed, setIsRightShiftPressed] = useState(false);
  const [isLeftShiftPressed, setIsLeftShiftPressed] = useState(false);

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
      if (event.repeat) return;
      if (event.key === 'Shift') {
        if (event.location === KeyboardEvent.DOM_KEY_LOCATION_RIGHT) {
          setShowText(true);
          setIsRightShiftPressed(true);
        } else if (event.location === KeyboardEvent.DOM_KEY_LOCATION_LEFT) {
          setIsLeftShiftPressed(true);
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Shift') {
        if (event.location === KeyboardEvent.DOM_KEY_LOCATION_RIGHT) {
          setShowText(false);
          setIsRightShiftPressed(false);
        } else if (event.location === KeyboardEvent.DOM_KEY_LOCATION_LEFT) {
          setIsLeftShiftPressed(false);
        }
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

  useEffect(() => {
    if (isRightShiftPressed && isLeftShiftPressed && text && translation) {
      navigator.clipboard.writeText(`${formatQueryText(text)}\n\n${translation}`);
    }
  }, [isRightShiftPressed, isLeftShiftPressed, text, translation]);

  useEffect(() => {
    if (!isRightShiftPressed) {
      setTranslation('');
    }
  }, [isRightShiftPressed]);

  const left = highlighterStyle.left;
  const top = highlighterStyle.top;
  const windowHeight = window.innerHeight;
  const bottom = windowHeight - top;
  const width = highlighterStyle.width;
  const padding = 8;

  // TODO: 顶部溢出

  return (
    <>
      <Dashboard />
      {showText && (
        <div
          className="pointer-events-none absolute border border-blue-500"
          style={{
            zIndex: 2147483647,
            ...highlighterStyle,
          }}
        />
      )}
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
          {translation}
        </div>
      )}
      {/* <RWKVNotification /> */}
    </>
  );
}
