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

const handleNode = (_node: Node) => {
  const node = _node as HTMLElement;
  const nodeName = node.nodeName;

  // 过滤掉不需要处理的节点
  if (ignoreTypeUpper.includes(nodeName) || ignoreTypeLower.includes(nodeName)) {
    return;
  }
  const textContent = node.textContent?.trim();

  // 如果文本内容为空, 则不处理
  if (textContent === '' || textContent === undefined || textContent === null) {
    return;
  }

  // 只包含符号和数字
  const isOnlySymbolsAndNumbers = /^[0-9\s\p{P}]+$/u.test(textContent);

  // 长度太短
  const isTooShort = textContent.length <= 2;

  // 包含的英文字符长度小于 3
  // "ab 哈哈哈ab 哈哈哈" 包含 4 个英文字符, 但是, 最长连续英文字符是 2, 所以, 不解释了
  const hasConsecutiveEnglishLetters = /[a-zA-Z]{3,}/.test(textContent);

  if (isOnlySymbolsAndNumbers || isTooShort || !hasConsecutiveEnglishLetters) {
    return;
  }

  // 检查节点是否隐藏
  const computedStyle = window.getComputedStyle(node);
  if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden' || computedStyle.opacity === '0') {
    return;
  }

  const childNodes = Array.from(node.childNodes) as HTMLElement[];
  const childNodesLength = childNodes.length;
  let nonTextChildNodesTextContent = '';

  for (const childNode of childNodes) {
    const childNodeName = childNode.nodeName;

    if (childNodeName !== '#text') {
      const childNodeTextContent = childNode.textContent?.trim();
      // 如果非 #text 子节点承载了全部的内容, 则不处理
      nonTextChildNodesTextContent += childNodeTextContent;
      if (nonTextChildNodesTextContent === textContent) {
        return;
      }
    }
  }

  if (childNodesLength == 1) {
    //
  } else if (childNodesLength > 1) {
    //
  } else {
    //
  }

  // DEBUG 时标记
  (node as HTMLElement).style.outline = '2px solid rgba(0, 0, 0, 0.1)';

  // DEBUG 时打印
  console.log(node);
  console.log(textContent);
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
