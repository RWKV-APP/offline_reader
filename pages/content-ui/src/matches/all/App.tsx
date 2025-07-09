import { useEffect, useState } from 'react';

// Define the shape of the highlighter's style state
interface HighlighterStyle {
  display: 'none' | 'block';
  left: number;
  top: number;
  width: number;
  height: number;
}

const port = 52345;

const formatTranslation = (translation: string) => {
  // 去掉 `[12]` 这种形式
  const regex = /\[(\d+)\]/g;
  // 去掉 `[citation needed]`
  const regex2 = /\[citation needed\]/g;
  // 在中文和英文之间添加空格
  const addSpaceBetweenChineseAndEnglish = (str: string) =>
    str.replace(/([a-zA-Z0-9])([\u4e00-\u9fa5])/g, '$1 $2').replace(/([\u4e00-\u9fa5])([a-zA-Z])/g, '$1 $2');

  return addSpaceBetweenChineseAndEnglish(translation.replace(regex, '').replace(regex2, '').trim());
};

const formatText = (text: string) => {
  // 统一处理所有方括号引用格式：
  // - [12] 单个数字
  // - [1,2,3] 多个数字（无空格）
  // - [1, 2, 3] 多个数字（有空格）
  // - [citation needed] 引用需要
  // - [1-5] 数字范围
  // - [1, 2, 3; 4, 5] 复杂组合
  const citationRegex = /\[[^\]]*\]/g;
  return text.replace(citationRegex, '').trim();
};

const query = async (textToTranslate: string) => {
  const url = `http://localhost:${port}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: textToTranslate }),
  });
  const data = await res.json();
  return data;
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
      navigator.clipboard.writeText(`${formatText(text)}\n\n${translation}`);
    }
  }, [isRightShiftPressed, isLeftShiftPressed, text, translation]);

  useEffect(() => {
    if (isRightShiftPressed && text) {
      const timer = setInterval(async () => {
        const sourceText = formatText(text);
        // TODO: 通常, 这种情况发生在, 截获了大量 innerText 时
        if (sourceText.length > 3000) {
          console.log('sourceText.length > 3000', sourceText.length);
          return;
        }
        const data = await query(sourceText);
        const { translation } = data;
        setTranslation(formatTranslation(translation));
      }, 50);
      return () => clearInterval(timer);
    }
    return () => {};
  }, [isRightShiftPressed, text]);

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
    </>
  );
}
