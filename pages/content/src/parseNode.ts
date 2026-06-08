import { checkBreakLineHappened } from './checkBreakLineHappened';
import { getPriority } from './getPriority';
import { simenticallyEqual } from './simenticallyEqual';
import { state } from './state';
import { createTypewriter } from './typewriter';
import { formatTranslation, ignoreHref, isChinese, isUrl, queryTranslationStream, rwkvClass } from '@extension/shared';

const ignoreTypeLower = ['path', 'script', 'style', 'svg', 'noscript', 'head', 'pre', 'code', 'math', 'textarea'];
const ignoreTypeUpper = ignoreTypeLower.map(item => item.toUpperCase());
const ignoreTypes = ignoreTypeLower.concat(ignoreTypeUpper);
const checkingTypeLower = ['turbo-frame', 'article', 'main'];
// const checkingTypeLower: string[] = [];
const checkingTypeUpper = checkingTypeLower.map(item => item.toUpperCase());
const checkingTypes = checkingTypeLower.concat(checkingTypeUpper);
const pendingPrioritySyncDelayMs = 150;
let tick = 0;
let pendingPrioritySyncTimer: number | null = null;

export const forceBreakLineTags = ['ul', 'ol', 'li'];
export const forceBreakLineTagsUpper = forceBreakLineTags.map(item => item.toUpperCase());

const syncPendingTranslationPriorities = () => {
  const priorities = Array.from(
    document.querySelectorAll<HTMLElement>(
      `.${rwkvClass.target}[data-rwkv-translation-state="streaming"][data-rwkv-translation-request-id]`,
    ),
  ).map(node => ({
    requestId: node.dataset.rwkvTranslationRequestId ?? '',
    priority: getPriority(node),
  }));
  const validPriorities = priorities.filter(priority => priority.requestId !== '');

  if (validPriorities.length === 0) {
    return;
  }

  try {
    chrome.runtime.sendMessage({
      func: 'UpdateTranslationPriorities',
      body: {
        priorities: validPriorities,
      },
    });
  } catch (error) {
    console.warn('同步翻译优先级失败:', error);
  }
};

export const schedulePendingTranslationPrioritySync = () => {
  if (pendingPrioritySyncTimer !== null) {
    return;
  }

  pendingPrioritySyncTimer = window.setTimeout(() => {
    requestAnimationFrame(() => {
      pendingPrioritySyncTimer = null;
      syncPendingTranslationPriorities();
    });
  }, pendingPrioritySyncDelayMs);
};

export const parseNode = (_node: Node): boolean => {
  const currentUrl = window.location.href;
  for (const href of ignoreHref) {
    const startWith = currentUrl.startsWith(href);
    if (startWith) return false;
  }

  const node = _node as HTMLElement;
  const nodeName = node.nodeName;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const checking = checkingTypes.includes(nodeName);

  if (!state.running) {
    return false;
  }

  const parentNode = node.parentElement;
  if (!parentNode) return false;

  const parentNodeName = parentNode.nodeName;

  for (const ignoreType of ignoreTypes) {
    const closest = parentNode?.closest(ignoreType);
    if (closest) return false;
  }

  if (parentNode.classList.contains('rwkvOfflineTarget')) return false;

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

  if (node.classList.contains(rwkvClass.done) || node.dataset.rwkvTranslationState === 'streaming') return false;

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

  if (notEmptyTextChildNodesCount <= 0) return true;

  node.classList.add(rwkvClass.target);
  if (state.inspecting) node.classList.add(rwkvClass.inspect);

  const breakLineHappened = checkBreakLineHappened(node);

  const loadingSpinner = document.createElement('span');
  if (node.querySelector(`.${rwkvClass.spinner}`) === null) {
    loadingSpinner.classList.add(rwkvClass.spinner);
    if (state.inspecting) loadingSpinner.classList.add(rwkvClass.inspect);
    node.appendChild(loadingSpinner);
  }

  const nodeToBeAdded = document.createElement('span');
  nodeToBeAdded.classList.add(rwkvClass.result);
  nodeToBeAdded.dataset.rwkvLayout = breakLineHappened ? 'block' : 'inline';
  if (state.inspecting) nodeToBeAdded.classList.add(rwkvClass.inspect);
  node.appendChild(nodeToBeAdded);
  node.dataset.rwkvTranslationState = 'streaming';

  const priority = getPriority(node);
  tick++;

  let rawTranslation = '';
  let streamController: ReturnType<typeof queryTranslationStream> | null = null;
  let streamFinished = false;
  let cacheHit = false;

  const clearStreamingState = () => {
    if (node.dataset.rwkvTranslationState === 'streaming') {
      delete node.dataset.rwkvTranslationState;
    }
    delete node.dataset.rwkvTranslationRequestId;
  };

  const removeSpinner = () => {
    if (loadingSpinner.parentElement === node) loadingSpinner.remove();
  };

  const isActive = () =>
    state.running &&
    node.isConnected &&
    node.dataset.rwkvTranslationState === 'streaming' &&
    (streamController === null || node.dataset.rwkvTranslationRequestId === streamController.requestId);

  const typewriter = createTypewriter({
    write: value => {
      nodeToBeAdded.textContent = value;
    },
    isActive,
  });

  const monitorId = window.setInterval(() => {
    if (isActive()) return;
    streamController?.cancel();
    typewriter.stop();
    removeSpinner();
    if (nodeToBeAdded.parentElement === node) nodeToBeAdded.remove();
    clearStreamingState();
    window.clearInterval(monitorId);
  }, 1000);

  const stopMonitor = () => {
    window.clearInterval(monitorId);
  };

  const formatForDisplay = (translation: string) => {
    const formatted = formatTranslation(translation);
    if (formatted === '') return '';
    return breakLineHappened ? formatted : ` ${formatted}`;
  };

  const syncInspectClasses = () => {
    if (state.inspecting) {
      if (!nodeToBeAdded.classList.contains(rwkvClass.inspect)) nodeToBeAdded.classList.add(rwkvClass.inspect);
      if (!node.classList.contains(rwkvClass.inspect)) node.classList.add(rwkvClass.inspect);
      return;
    }

    if (nodeToBeAdded.classList.contains(rwkvClass.inspect)) nodeToBeAdded.classList.remove(rwkvClass.inspect);
    if (node.classList.contains(rwkvClass.inspect)) node.classList.remove(rwkvClass.inspect);
  };

  const finishNode = () => {
    syncInspectClasses();
    node.classList.add(rwkvClass.done);
    clearStreamingState();
    stopMonitor();
  };

  const finishWithoutOutput = () => {
    removeSpinner();
    typewriter.finish('', () => {
      if (nodeToBeAdded.parentElement === node) nodeToBeAdded.remove();
      finishNode();
    });
  };

  const finishWithoutOutputImmediately = () => {
    typewriter.stop();
    removeSpinner();
    nodeToBeAdded.textContent = '';
    if (nodeToBeAdded.parentElement === node) nodeToBeAdded.remove();
    finishNode();
  };

  const finishWithOutputImmediately = (translation: string) => {
    typewriter.stop();
    removeSpinner();
    nodeToBeAdded.textContent = formatForDisplay(translation);
    finishNode();
  };

  const failNode = (error: string) => {
    console.warn('translation stream failed', error);
    streamFinished = true;
    typewriter.stop();
    removeSpinner();
    if (nodeToBeAdded.parentElement === node) nodeToBeAdded.remove();
    clearStreamingState();
    stopMonitor();
  };

  streamController = queryTranslationStream(
    { source: textContent, logic: 'translate', url: currentUrl, nodeName, priority, tick },
    {
      onSnapshot: message => {
        if (!isActive()) return;
        rawTranslation = message.body.translation;
        if (message.body.fromCache === true) {
          cacheHit = true;
          typewriter.stop();
          removeSpinner();
          nodeToBeAdded.textContent =
            rawTranslation === '' || simenticallyEqual(rawTranslation, message.body.source)
              ? ''
              : formatForDisplay(rawTranslation);
          return;
        }

        typewriter.setTarget(formatForDisplay(rawTranslation));
      },
      onDelta: message => {
        if (!isActive() || streamFinished) return;
        rawTranslation += message.body.delta;
        typewriter.setTarget(formatForDisplay(rawTranslation));
      },
      onDone: message => {
        if (!isActive()) return;
        streamFinished = true;
        removeSpinner();

        const { translation, source } = message.body;
        const shouldRenderOutput = translation !== '' && !simenticallyEqual(translation, source);
        const shouldSkipTypewriter = cacheHit || message.body.fromCache === true;

        if (!shouldRenderOutput) {
          if (shouldSkipTypewriter) {
            finishWithoutOutputImmediately();
            return;
          }

          finishWithoutOutput();
          return;
        }

        if (shouldSkipTypewriter) {
          finishWithOutputImmediately(translation);
          return;
        }

        typewriter.finish(formatForDisplay(translation), finishNode);
      },
      onError: message => {
        if (!isActive()) return;
        failNode(message.body.error);
      },
    },
  );
  node.dataset.rwkvTranslationRequestId = streamController.requestId;

  return true;
};
