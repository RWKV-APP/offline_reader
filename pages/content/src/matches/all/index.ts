import { ignoreHref, query, queryWS, targetClass, translationDoneClass } from '@extension/shared';
import { sampleFunction } from '@src/sample-function';

console.log('[CEB] All content script loaded');

void sampleFunction();

const handleMouseOver = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  const isTarget = target.classList.contains(targetClass);

  if (isTarget && target && target.innerText) {
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

const forceBreakLineTags = ['ul', 'ol', 'li'];
const forceBreakLineTagsUpper = forceBreakLineTags.map(item => item.toUpperCase());

const checkBreakLineHappened = (node: HTMLElement) => {
  const computedStyle = window.getComputedStyle(node);
  if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden' || computedStyle.opacity === '0') {
    return false;
  }

  if (forceBreakLineTagsUpper.includes(node.nodeName) || forceBreakLineTags.includes(node.nodeName)) {
    return true;
  }

  // 获取文本内容
  const textContent = node.textContent?.trim();
  if (!textContent) {
    return false;
  }

  // 方法1: 检查 white-space 属性
  if (computedStyle.whiteSpace === 'nowrap') {
    return false; // 强制不换行，所以没有折行
  }

  // 方法2: 检查元素高度是否大于行高
  const lineHeight = parseFloat(computedStyle.lineHeight) || parseFloat(computedStyle.fontSize) * 1.2;
  const elementHeight = node.offsetHeight;

  // 如果元素高度明显大于行高，说明发生了折行
  if (elementHeight > lineHeight * 1.5) {
    return true;
  }

  // 方法3: 检查是否有换行符
  if (textContent.includes('\n') || textContent.includes('\r')) {
    return true;
  }

  // 方法4: 检查文本长度和容器宽度的比例
  const elementWidth = node.offsetWidth;
  const fontSize = parseFloat(computedStyle.fontSize);
  const estimatedCharWidth = fontSize * 0.6; // 估算每个字符的平均宽度
  const estimatedTextWidth = textContent.length * estimatedCharWidth;

  // 如果估算的文本宽度明显大于容器宽度，很可能发生折行
  if (estimatedTextWidth > elementWidth * 1.2) {
    return true;
  }

  return false;
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

const debuggingType: string[] = [];
const debuggingTypeUpper = debuggingType.map(item => item.toUpperCase());
const ignoreTypeLower = ['path', 'script', 'style', 'svg', 'noscript', 'head', 'pre', 'code'];
const ignoreTypeUpper = ignoreTypeLower.map(item => item.toUpperCase());
const ignoreTypes = ignoreTypeLower.concat(ignoreTypeUpper);

const handleNode = (_node: Node) => {
  const currentUrl = window.location.href;
  for (const href of ignoreHref) {
    const startWith = currentUrl.startsWith(href);
    if (startWith) return;
  }

  const node = _node as HTMLElement;
  const nodeName = node.nodeName;

  for (const ignoreType of ignoreTypes) {
    const closest = node.parentElement?.closest(ignoreType);
    if (closest) return;
  }

  const parentNode = node.parentElement;

  if (parentNode) {
    if (parentNode.classList.contains(targetClass)) {
      return;
    }
    if (ignoreTypeLower.includes(parentNode.nodeName) || ignoreTypeUpper.includes(parentNode.nodeName)) {
      return;
    }
  }

  const containsDebuggingType = debuggingType.length > 0;
  if (containsDebuggingType) {
    if (!debuggingTypeUpper.includes(nodeName) && !debuggingType.includes(nodeName)) {
      return;
    }
  }

  // 过滤掉不需要处理的节点
  if (ignoreTypeUpper.includes(nodeName) || ignoreTypeLower.includes(nodeName)) return;

  const textContent = node.textContent?.trim();

  // 如果文本内容为空, 则不处理
  if (textContent === '' || textContent === undefined || textContent === null) {
    return;
  }

  // 只包含符号和数字
  const isOnlySymbolsAndNumbers = /^[0-9\s\p{P}]+$/u.test(textContent);

  // 长度太短
  const isTooShort = textContent.length <= 3;

  // 包含的英文字符长度小于 3
  // "ab 哈哈哈ab 哈哈哈" 包含 4 个英文字符, 但是, 最长连续英文字符是 2, 所以, 不解释了
  const hasConsecutiveEnglishLetters = /[a-zA-Z]{4,}/.test(textContent);

  if (isOnlySymbolsAndNumbers || isTooShort || !hasConsecutiveEnglishLetters) {
    return;
  }

  if (parentNode?.parentElement) {
    const parentComputedStyle = window.getComputedStyle(parentNode.parentElement);
    if (
      parentComputedStyle.display === 'none' ||
      parentComputedStyle.visibility === 'hidden' ||
      parentComputedStyle.opacity === '0'
    ) {
      return;
    }
  }

  if (parentNode) {
    const parentComputedStyle = window.getComputedStyle(parentNode);
    if (
      parentComputedStyle.display === 'none' ||
      parentComputedStyle.visibility === 'hidden' ||
      parentComputedStyle.opacity === '0'
    ) {
      return;
    }
  }

  // 检查节点是否隐藏
  const computedStyle = window.getComputedStyle(node);
  if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden' || computedStyle.opacity === '0') {
    return;
  }

  if (node.classList.contains(translationDoneClass)) {
    return;
  }

  const childNodes = Array.from(node.childNodes) as HTMLElement[];
  let nonTextChildNodesTextContent = '';
  let notEmptyTextChildNodesCount = 0;
  for (const childNode of childNodes) {
    const childNodeName = childNode.nodeName;
    const isTextChildNode = childNodeName === '#text';

    if (!isTextChildNode) {
      const childNodeTextContent = childNode.textContent?.trim();
      // 如果非 #text 子节点承载了全部的内容, 则不处理
      nonTextChildNodesTextContent += childNodeTextContent;
      if (nonTextChildNodesTextContent === textContent) {
        return;
      }
    }

    if (isTextChildNode) {
      const textChildNodeTextContent = childNode.textContent?.trim();
      const hasText = textChildNodeTextContent && textChildNodeTextContent.length > 0;

      if (hasText) notEmptyTextChildNodesCount++;
    }
  }

  if (notEmptyTextChildNodesCount <= 0) {
    // if (childNodesLength == 7 && node.attributes.getNamedItem('icon')?.value === 'repo-forked') {
    //   console.log(node);
    //   console.log(childNodesNames);
    //   console.log(node.childNodes);
    //   console.log(childNodes.map(item => item.textContent?.trim()));
    //   console.log('notEmptyTextChildNodesCount <= 0');
    // }
    return;
  }

  // DEBUG 时标记
  node.style.outline = '1px solid rgba(255, 0, 0, 1.0)';
  // node.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';

  node.classList.add(targetClass);
  const breakLineHappened = checkBreakLineHappened(node);
  let parentElementName = 'span';
  if (breakLineHappened) {
    parentElementName = 'div';
  }

  const parentElement = document.createElement(parentElementName);

  let inner = breakLineHappened ? '' : ' ';
  queryWS({ text: textContent, logic: 'translate' }).then(json => {
    const { translation, source } = json;
    if (translation && translation !== source) {
      inner = parentElementName ? ' ' + translation : translation;
      parentElement.textContent = inner;
      node.appendChild(parentElement);
      node.classList.add(translationDoneClass);
    }
  });

  // // DEBUG 时打印
  // console.log({
  //   textContent,
  //   node,
  //   childNodesLength,
  //   childNodesNames,
  //   textChildNodesCount: notEmptyTextChildNodesCount,
  // });
};

const observer = new MutationObserver(mutationsList => {
  const currentUrl = window.location.href;
  for (const href of ignoreHref) {
    const startWith = currentUrl.startsWith(href);
    if (startWith) return;
  }

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
