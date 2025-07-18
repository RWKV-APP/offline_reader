import { injectCss } from './injectcss';
import { formatTranslation, ignoreHref, isChinese, isUrl, queryWS } from '@extension/shared';
import { translationModeStorage } from '@extension/storage';
import { sampleFunction } from '@src/sample-function';
import type { State } from '@extension/shared';
import type { TranslationMode } from '@extension/storage/lib/base/enums';

injectCss();

console.log('[CEB] All content script loaded');

void sampleFunction();

const state: State = {
  interactionMode: 'full',
  demoMode: false,
  ignored: false,
  running: false,
  ignoreHref,
  inspecting: false,
};

const handleStateChanged = (event: CustomEvent) => {
  const { interactionMode, demoMode, ignored, running, inspecting } = event.detail;
  state.interactionMode = interactionMode;
  state.demoMode = demoMode;
  state.ignored = ignored;
  state.running = running;
  const inspectingChanged = state.inspecting !== inspecting;
  state.inspecting = inspecting;
  console.log('state-changed: content', state);

  if (inspectingChanged) {
    document.body.querySelectorAll('.rwkv_offline_target').forEach(node => {
      if (inspecting && !node.classList.contains('rwkv_inspecting')) {
        node.classList.add('rwkv_inspecting');
      } else if (!inspecting && node.classList.contains('rwkv_inspecting')) {
        node.classList.remove('rwkv_inspecting');
      }
    });
    document.body.querySelectorAll('.rwkv_offline_translation_done').forEach(node => {
      if (inspecting && !node.classList.contains('rwkv_inspecting')) {
        node.classList.add('rwkv_inspecting');
      } else if (!inspecting && node.classList.contains('rwkv_inspecting')) {
        node.classList.remove('rwkv_inspecting');
      }
    });
    document.body.querySelectorAll('.rwkv_offline_translation_result').forEach(node => {
      if (inspecting && !node.classList.contains('rwkv_inspecting')) {
        node.classList.add('rwkv_inspecting');
      } else if (!inspecting && node.classList.contains('rwkv_inspecting')) {
        node.classList.remove('rwkv_inspecting');
      }
    });
    document.body.querySelectorAll('.rwkv_loading_spinner').forEach(node => {
      if (inspecting && !node.classList.contains('rwkv_inspecting')) {
        node.classList.add('rwkv_inspecting');
      } else if (!inspecting && node.classList.contains('rwkv_inspecting')) {
        node.classList.remove('rwkv_inspecting');
      }
    });
  }
};

document.addEventListener('state-changed', handleStateChanged as EventListener);

const handleMouseOver = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  const isTarget = target.classList.contains('rwkv_offline_target');

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
  if (!textContent) return false;

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

const ignoreTypeLower = ['path', 'script', 'style', 'svg', 'noscript', 'head', 'pre', 'code', 'math', 'textarea'];
const ignoreTypeUpper = ignoreTypeLower.map(item => item.toUpperCase());
const ignoreTypes = ignoreTypeLower.concat(ignoreTypeUpper);

const handleNode = (_node: Node): boolean => {
  const currentUrl = window.location.href;
  for (const href of ignoreHref) {
    const startWith = currentUrl.startsWith(href);
    if (startWith) return false;
  }

  const node = _node as HTMLElement;
  const nodeName = node.nodeName;

  const parentNode = node.parentElement;
  if (!parentNode) return false;

  const parentNodeName = parentNode.nodeName;

  for (const ignoreType of ignoreTypes) {
    const closest = parentNode?.closest(ignoreType);
    if (closest) return false;
  }

  if (parentNode.classList.contains('rwkv_offline_target')) return false;

  // 如果父节点不需要处理
  if (ignoreTypes.includes(parentNodeName)) return false;

  // 过滤掉不需要处理的节点
  if (ignoreTypes.includes(nodeName)) return false;

  const textContent = node.textContent?.trim();

  // 如果文本内容为空, 则不处理
  if (textContent === '' || textContent === undefined || textContent === null) return false;

  // 不处理汉语, 因为当前的模型就是汉语
  if (isChinese(textContent)) return false;
  if (isUrl(textContent)) return false;

  // 只包含符号和数字
  const isOnlySymbolsAndNumbers = /^[0-9\s\p{P}]+$/u.test(textContent);

  // 长度太短
  const isTooShort = textContent.length <= 3;

  // 包含的英文字符长度小于 3
  // "ab 哈哈哈ab 哈哈哈" 包含 4 个英文字符, 但是, 最长连续英文字符是 2, 所以, 不解释了
  // TODO: 需要考虑 x.com 的 "For you"
  const hasConsecutiveEnglishLetters = /[a-zA-Z]{4,}/.test(textContent);

  if (isOnlySymbolsAndNumbers || isTooShort || !hasConsecutiveEnglishLetters) {
    return false;
  }

  if (parentNode?.parentElement) {
    const parentComputedStyle = window.getComputedStyle(parentNode.parentElement);
    if (
      parentComputedStyle.display === 'none' ||
      parentComputedStyle.visibility === 'hidden' ||
      parentComputedStyle.opacity === '0'
    ) {
      return false;
    }
  }

  if (parentNode) {
    const parentComputedStyle = window.getComputedStyle(parentNode);
    if (
      parentComputedStyle.display === 'none' ||
      parentComputedStyle.visibility === 'hidden' ||
      parentComputedStyle.opacity === '0'
    ) {
      return false;
    }
  }

  // 检查节点是否隐藏
  const computedStyle = window.getComputedStyle(node);
  if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden' || computedStyle.opacity === '0') {
    return true;
  }

  if (node.classList.contains('rwkv_offline_translation_done')) return false;

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
        return true;
      }
    }

    if (isTextChildNode) {
      const textChildNodeTextContent = childNode.textContent?.trim();
      const hasText = textChildNodeTextContent && textChildNodeTextContent.length > 0;

      if (hasText) notEmptyTextChildNodesCount++;
    }
  }

  if (notEmptyTextChildNodesCount <= 0) return false;

  node.classList.add('rwkv_offline_target');
  const breakLineHappened = checkBreakLineHappened(node);
  const nodeNameToBeAdded = breakLineHappened ? 'div' : 'span';

  const loadingSpinner = document.createElement('span');
  if (node.querySelector('.rwkv_loading_spinner') === null) {
    loadingSpinner.classList.add('rwkv_loading_spinner');
    node.appendChild(loadingSpinner);
  }

  const nodeToBeAdded = document.createElement(nodeNameToBeAdded);
  nodeToBeAdded.classList.add('rwkv_offline_translation_result');
  queryWS({ source: textContent, logic: 'translate', url: currentUrl })
    .then(json => {
      if (node.classList.contains('rwkv_offline_translation_done')) return;

      const { translation, source } = json.body;
      if (translation && translation !== source) {
        let inner = formatTranslation(translation);
        if (!breakLineHappened) inner = ' ' + inner;
        nodeToBeAdded.textContent = inner;
        node.appendChild(nodeToBeAdded);
        node.classList.add('rwkv_offline_translation_done');
      }
    })
    .finally(() => {
      if (loadingSpinner.parentElement === node) {
        loadingSpinner.remove();
      }
    });

  return true;
};

/**
 * 处理翻译模式变更
 * @param mode 翻译模式 - 可选值:
 * - TranslationMode.Immersive - 沉浸式
 * - TranslationMode.Hover - 悬浮式
 * - TranslationMode.Special - 特殊式 - 这个或许作为展会时的模式
 * - TranslationMode.None - 不翻译
 */
const handleTranslationModeChange = (mode: TranslationMode) => {
  void translationModeStorage.setMode(mode);
};

const observer = new MutationObserver(mutationsList => {
  const currentUrl = window.location.href;
  for (const href of ignoreHref) {
    const startWith = currentUrl.startsWith(href);
    if (startWith) return;
  }

  for (const mutation of mutationsList) {
    const type = mutation.type;
    if (type === 'childList') {
      const addedNodes = Array.from(mutation.addedNodes);
      for (const addedNode of addedNodes) {
        if (addedNode.nodeType === 1) {
          const shouldHandleChildNodes = handleNode(addedNode);
          if (shouldHandleChildNodes) (addedNode as Element).querySelectorAll('*').forEach(handleNode);
        }
      }
    }
  }
});

// 开始监听 document.body 的所有子节点变化
observer.observe(document.body, {
  childList: true,
  subtree: true,
});

// 初始遍历已有 DOM
document.body.querySelectorAll('*').forEach(handleNode);
