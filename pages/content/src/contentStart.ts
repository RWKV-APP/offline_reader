import { handleNode } from './handleNode';
import { injectCss } from './injectcss';
import { state } from './state';
import { ignoreHref } from '@extension/shared';
import type { AllMessage } from '@extension/shared';

export const contentStart = () => {
  injectCss();

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
      console.log('inspectingChanged', inspecting);
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
      } else {
        document.body.querySelectorAll('*').forEach(handleNode);
      }
    }
  };

  // 监听来自 background 的消息
  const handleMessage = (
    message: AllMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void,
  ) => {
    console.log('content: 收到消息', message.func);

    const { func } = message;
    switch (func) {
      case 'GetStateResponse':
      case 'OnStateChanged': {
        console.log('content: 收到状态更新', message);
        // 触发自定义事件，让现有的监听器处理
        document.dispatchEvent(new CustomEvent('state-changed', { detail: message }));
        break;
      }
      case 'QueryRequest':
      case 'QueryResponse':
      case 'SetState':
      case 'GetState': {
        // 这些消息在 content script 中不需要处理
        break;
      }
    }
  };

  // 添加消息监听器
  chrome.runtime.onMessage.addListener(handleMessage);

  document.addEventListener('state-changed', handleStateChanged as EventListener);

  // 初始化时请求状态
  setTimeout(() => {
    console.log('content: 请求初始状态');
    try {
      chrome.runtime.sendMessage({ func: 'GetState' });
    } catch (error) {
      console.error('content: 请求状态失败', error);
    }
  }, 100);

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
};
