import { sampleFunction } from '@src/sample-function';

console.log('[CEB] All content script loaded');

void sampleFunction();

const handleMouseOver = (event: MouseEvent) => {
  const target = event.target as HTMLElement;

  if (target && target.innerText) {
    const text = target.innerText.trim();

    if (text) {
      console.log('handleMouseOver');
      console.log(text);
      const rect = target.getBoundingClientRect();
      console.log(rect);
      // Dispatch a custom event with the element's position and size
      document.dispatchEvent(
        new CustomEvent('ceb-show-highlighter', {
          detail: {
            rect: {
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height,
            },
            text,
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

const handleKeyDown = (event: KeyboardEvent) => {
  // Check for the specific code for the right Shift key.
  if (event.code === 'ShiftRight') {
    // Prevent any default browser action if needed, though Shift alone usually has none.
    // event.preventDefault();

    console.log('Right Shift pressed. Dispatching event to show floating window.');
    document.dispatchEvent(new CustomEvent('ceb-show-floating-window'));
  }
};

const handleKeyUp = (event: KeyboardEvent) => {
  console.log('Key up');
  if (event.code === 'ShiftRight') {
    document.dispatchEvent(new CustomEvent('ceb-hide-floating-window'));
  }
};

const initializeKeyListeners = () => {
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);
  console.log('Key listeners initialized.');
};

// Initialize the key listener
initializeKeyListeners();
