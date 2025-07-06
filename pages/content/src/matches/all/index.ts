import { sampleFunction } from '@src/sample-function';

console.log('[CEB] All content script loaded');

void sampleFunction();

const handleMouseOver = (event: MouseEvent) => {
  const target = event.target as HTMLElement;

  if (target && target.innerText) {
    const text = target.innerText.trim();
    const position = {
      x: event.clientX,
      y: event.clientY,
    };

    if (text) {
      console.log('[pages/content/src/matches/all/index.ts:18:handleMouseOver]', text, position);
      const rect = target.getBoundingClientRect();
      // Dispatch a custom event with the element's position and size
      document.dispatchEvent(
        new CustomEvent('ceb-show-highlighter', {
          detail: {
            rect: {
              left: rect.left + window.scrollX,
              top: rect.top + window.scrollY,
              width: rect.width,
              height: rect.height,
            },
          },
        }),
      );
    } else {
      // Dispatch an event to hide the highlighter
      document.dispatchEvent(new CustomEvent('ceb-hide-highlighter'));
    }
  } else {
    // Dispatch an event to hide the highlighter
    document.dispatchEvent(new CustomEvent('ceb-hide-highlighter'));
  }
};

const initializeHoverListener = () => {
  document.addEventListener('mouseover', handleMouseOver);
  console.log('Hover listener initialized (event dispatch only).');
};

// Initialize the hover listener
initializeHoverListener();
