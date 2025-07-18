import { handleNode } from './handleNode';
import { injectCss } from './injectcss';
import { state } from './state';
import { ignoreHref } from '@extension/shared';
import { sampleFunction } from '@src/sample-function';
import { run } from 'node:test';

injectCss();

console.log('[CEB] All content script loaded');

void sampleFunction();

const handleStateChanged = (event: CustomEvent) => {
  const { interactionMode, demoMode, ignored, running, inspecting } = event.detail;
  state.interactionMode = interactionMode;
  state.demoMode = demoMode;
  state.ignored = ignored;
  const runningChanged = state.running !== running;
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

  if (runningChanged) {
    if (!running) {
      document.body.querySelectorAll('.rwkv_loading_spinner').forEach(node => {
        node.remove();
      });
    }
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

export const checkBreakLineHappened = (node: HTMLElement) => {
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
