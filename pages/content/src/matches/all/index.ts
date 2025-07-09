import { sampleFunction } from '@src/sample-function';

console.log('[CEB] All content script loaded');

void sampleFunction();

const handleMouseOver = (event: MouseEvent) => {
  const target = event.target as HTMLElement;

  if (target && target.innerText) {
    const text = target.innerText.trim();

    if (text) {
      const rect = target.getBoundingClientRect();
      // Dispatch a custom event with the element's position and size
      const left = rect.left;
      const top = rect.top;
      const width = rect.width;
      const height = rect.height;

      document.dispatchEvent(
        new CustomEvent('ceb-show-highlighter', {
          detail: {
            rect: {
              left,
              top,
              width,
              height,
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

    document.dispatchEvent(new CustomEvent('ceb-show-floating-window'));
  }
};

const handleKeyUp = (event: KeyboardEvent) => {
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

const ignoreTypeLower = ['path', 'script', 'style', 'svg', 'noscript', 'head'];
const ignoreTypeUpper = ignoreTypeLower.map(item => item.toUpperCase());

const handleNode = (node: Node) => {
  // 对 node 做你要的操作
  if (ignoreTypeUpper.includes(node.nodeName) || ignoreTypeLower.includes(node.nodeName)) {
    return;
  }

  // 只获取该元素本身的文本内容，不包括子元素
  let ownTextContent = '';
  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as Element;
    // 遍历直接子节点，只收集文本节点的内容
    for (const childNode of Array.from(element.childNodes)) {
      if (childNode.nodeType === Node.TEXT_NODE) {
        ownTextContent += childNode.textContent || '';
      }
    }
  }

  ownTextContent = ownTextContent.trim();

  if (ownTextContent === '' || ownTextContent === undefined || ownTextContent === null) {
    return;
  }

  // 过滤条件：如果只包含字母数字、或者只包含符号数字、或者长度太短，则不处理
  const isOnlySymbolsAndNumbers = /^[0-9\s\p{P}]+$/u.test(ownTextContent);
  const isTooShort = ownTextContent.length <= 2;

  // 检查是否包含至少一段由3个或更多连续英文字母组成的文本
  const hasConsecutiveEnglishLetters = /[a-zA-Z]{3,}/.test(ownTextContent);

  if (isOnlySymbolsAndNumbers || isTooShort || !hasConsecutiveEnglishLetters) {
    return;
  }

  (node as HTMLElement).style.outline = '1px solid rgba(0, 0, 0, 0.1)';
  console.log(node);
  console.log(ownTextContent);
};

const observer = new MutationObserver(mutationsList => {
  for (const mutation of mutationsList) {
    if (mutation.type === 'childList') {
      Array.from(mutation.addedNodes).forEach(newNode => {
        if (newNode.nodeType === 1) {
          // 只处理 Element
          handleNode(newNode);
          // 如果新节点还有子元素
          (newNode as Element).querySelectorAll('*').forEach(handleNode);
        }
      });
    }
  }
});

// 开始监听 document.body 的所有子节点变化
observer.observe(document.body, {
  childList: true,
  subtree: true,
});

// 初始遍历已有 DOM
document.querySelectorAll('*').forEach(handleNode);
