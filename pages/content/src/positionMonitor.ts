import { state } from './state';
import { rwkvClass } from '@extension/shared';
import type { ElementPosition } from '@extension/shared';

// 位置缓存，避免重复发送相同位置
const positionCache = new Map<string, ElementPosition>();
let syncTimer: number | null = null;
let isMonitoring = false;

// 生成元素唯一ID
const generateElementId = (element: HTMLElement): string => {
  // 使用更稳定的ID生成方式
  const text = element.textContent?.trim() || '';
  const tagName = element.tagName;
  const className = element.className;
  const parentText = element.parentElement?.textContent?.trim() || '';

  // 创建一个基于元素特征的哈希
  const hash = `${tagName}-${className}-${text.slice(0, 30)}-${parentText.slice(0, 20)}`;

  // 如果元素有data属性，也包含进去
  const dataAttrs = Array.from(element.attributes)
    .filter(attr => attr.name.startsWith('data-'))
    .map(attr => `${attr.name}=${attr.value}`)
    .join('-');

  return dataAttrs ? `${hash}-${dataAttrs}` : hash;
};

// 获取元素位置信息
const getElementPosition = (element: HTMLElement): ElementPosition | null => {
  try {
    const rect = element.getBoundingClientRect();
    const text = element.textContent?.trim() || '';

    // 检查元素是否可见
    if (rect.width === 0 || rect.height === 0) {
      return null;
    }

    // 移除视口检查，允许监听所有元素，包括不在当前视口内的元素
    // 这样可以支持多屏幕和滚动页面的bbox渲染

    return {
      id: generateElementId(element),
      rect: {
        left: rect.left + window.scrollX,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      },
      text,
      type: element.classList.contains(rwkvClass.target)
        ? 'target'
        : element.classList.contains(rwkvClass.result)
          ? 'result'
          : element.classList.contains(rwkvClass.spinner)
            ? 'spinner'
            : element.classList.contains(rwkvClass.done)
              ? 'done'
              : 'target',
    };
  } catch (error) {
    console.warn('获取元素位置失败:', error);
    return null;
  }
};

// 收集所有rwkvClass元素的位置
const collectPositions = (): ElementPosition[] => {
  const positions: ElementPosition[] = [];
  const selectors = [`.${rwkvClass.target}`, `.${rwkvClass.result}`, `.${rwkvClass.spinner}`, `.${rwkvClass.done}`];

  selectors.forEach(selector => {
    const elements = document.querySelectorAll<HTMLElement>(selector);
    elements.forEach(element => {
      const position = getElementPosition(element);
      if (position) {
        positions.push(position);
      }
    });
  });

  return positions;
};

// 检查位置是否有变化
const hasPositionChanged = (newPositions: ElementPosition[]): boolean => {
  if (newPositions.length !== positionCache.size) {
    return true;
  }

  for (const position of newPositions) {
    const cached = positionCache.get(position.id);
    if (!cached) {
      return true;
    }

    const { rect: newRect } = position;
    const { rect: cachedRect } = cached;

    if (
      Math.abs(newRect.left - cachedRect.left) > 1 ||
      Math.abs(newRect.top - cachedRect.top) > 1 ||
      Math.abs(newRect.width - cachedRect.width) > 1 ||
      Math.abs(newRect.height - cachedRect.height) > 1
    ) {
      return true;
    }
  }

  return false;
};

// 更新位置缓存
const updatePositionCache = (positions: ElementPosition[]) => {
  positionCache.clear();
  positions.forEach(position => {
    positionCache.set(position.id, position);
  });
};

// 发送位置同步消息
const sendPositionSync = (positions: ElementPosition[]) => {
  try {
    chrome.runtime.sendMessage({
      func: 'PositionSync',
      body: {
        positions,
        tabId: -1, // 使用 -1 代替 chrome.tabs.TAB_ID_NONE
      },
    });
  } catch (error) {
    console.warn('发送位置同步消息失败:', error);
  }
};

// 节流函数，确保200ms内只执行一次
const throttledSync = () => {
  if (syncTimer) {
    return;
  }

  syncTimer = window.setTimeout(() => {
    // 使用requestAnimationFrame确保在下一帧执行，提高性能
    requestAnimationFrame(() => {
      const positions = collectPositions();

      if (hasPositionChanged(positions)) {
        updatePositionCache(positions);
        sendPositionSync(positions);
      }

      syncTimer = null;
    });
  }, 200);
};

// 监听DOM变化
const observeDOMChanges = () => {
  const observer = new MutationObserver(() => {
    if (isMonitoring) {
      throttledSync();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class'],
  });

  return observer;
};

// 监听滚动和窗口大小变化
const observeViewportChanges = () => {
  const handleViewportChange = () => {
    if (isMonitoring) {
      throttledSync();
    }
  };

  window.addEventListener('scroll', handleViewportChange, { passive: true });
  window.addEventListener('resize', handleViewportChange, { passive: true });

  return () => {
    window.removeEventListener('scroll', handleViewportChange);
    window.removeEventListener('resize', handleViewportChange);
  };
};

let domObserver: MutationObserver | null = null;
let viewportCleanup: (() => void) | null = null;

// 启动位置监听
export const startPositionMonitoring = () => {
  if (isMonitoring) {
    return;
  }

  // 检查 HUD 诊断模式是否开启
  if (!state.showBBox) {
    return;
  }

  isMonitoring = true;
  positionCache.clear();

  // 启动DOM监听
  domObserver = observeDOMChanges();

  // 启动视口监听
  viewportCleanup = observeViewportChanges();

  // 立即执行一次同步
  throttledSync();
};

// 停止位置监听
export const stopPositionMonitoring = () => {
  if (!isMonitoring) {
    return;
  }

  isMonitoring = false;

  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }

  if (domObserver) {
    domObserver.disconnect();
    domObserver = null;
  }

  if (viewportCleanup) {
    viewportCleanup();
    viewportCleanup = null;
  }

  positionCache.clear();
};

// 强制同步一次位置
export const forcePositionSync = () => {
  if (!isMonitoring) {
    return;
  }

  const positions = collectPositions();
  updatePositionCache(positions);
  sendPositionSync(positions);
};
