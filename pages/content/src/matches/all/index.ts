import { sampleFunction } from '@src/sample-function';

console.log('[CEB] All content script loaded');

void sampleFunction();

const throttle = <A extends unknown[]>(func: (...args: A) => void, limit: number): ((...args: A) => void) => {
  let inThrottle: boolean;
  return (...args: A) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
};

const handleMouseOver = (event: MouseEvent) => {
  const target = event.target as HTMLElement;

  // Ensure we are targeting an actual element with text content
  if (target && typeof target.innerText === 'string') {
    const text = target.innerText.trim();
    const position = {
      x: event.clientX,
      y: event.clientY,
    };

    // We only log non-empty text to avoid clutter
    if (text) {
      console.log('Hovered Text:', text);
      console.log('Hovered Position:', position);
    }
  }
};

const initializeHoverListener = () => {
  const throttledMouseOver = throttle(handleMouseOver, 100);

  document.addEventListener('mouseover', throttledMouseOver);
  console.log('Hover listener initialized.');
};

// Initialize the hover listener
initializeHoverListener();
