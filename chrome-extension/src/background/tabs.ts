/* eslint-disable @typescript-eslint/no-unused-vars */
import { ws } from '.';
import { windowsAll } from './windows';

const getActiveTabForFocusedWindow = async (): Promise<chrome.tabs.Tab | null> => {
  try {
    const [activeTab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
      lastFocusedWindow: true,
      pinned: false,
    });
    return activeTab;
  } catch (error) {
    console.error('Error getting active tab:', error);
    return null;
  }
};

const getAllTabs = async (): Promise<chrome.tabs.Tab[]> => {
  try {
    return await chrome.tabs.query({});
  } catch (error) {
    console.error('Error getting all tabs:', error);
    return [];
  }
};

export const all = () => {
  try {
    getActiveTabForFocusedWindow().then(tab => {
      if (tab == null) {
        return;
      }
      const id = tab.id;
      const url = tab.url;
      const title = tab.title;
      const favIconUrl = tab.favIconUrl;
      const windowId = tab.windowId;
      const lastAccessed = Date.now() ?? tab.lastAccessed;
      const data = {
        logic: 'tab_actived',
        tab: { id, url, title, favIconUrl, windowId, lastAccessed },
      };
      ws?.send(JSON.stringify(data));
    });
    getAllTabs().then(tabs => {
      const data = {
        logic: 'tabs_all',
        tabs: tabs.map(tab => {
          const id = tab.id;
          const url = tab.url;
          const title = tab.title;
          const favIconUrl = tab.favIconUrl;
          const windowId = tab.windowId;
          const lastAccessed = tab.lastAccessed;
          return { id, url, title, favIconUrl, windowId, lastAccessed };
        }),
      };
      ws?.send(JSON.stringify(data));
    });
  } catch (error) {
    console.error('Error getting all tabs:', error);
  }
};

export const tabsAll = async (tabs: chrome.tabs.Tab[]) => {
  const data = {
    logic: 'tabs_all',
    tabs: tabs.map(tab => {
      const id = tab.id;
      const url = tab.url;
      const title = tab.title;
      const favIconUrl = tab.favIconUrl;
      const windowId = tab.windowId;
      const lastAccessed = tab.lastAccessed;
      return { id, url, title, favIconUrl, windowId, lastAccessed };
    }),
  };
  ws?.send(JSON.stringify(data));
};

const _onHighlighted = (activeInfo: chrome.tabs.TabHighlightInfo) => {
  all();
  windowsAll();
};

const _onRemoved = (tabId: number, removeInfo: chrome.tabs.TabRemoveInfo) => {
  all();
  windowsAll();
};

const _onUpdated = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
  all();
  windowsAll();
};

const _onAttached = (tabId: number, attachInfo: chrome.tabs.TabAttachInfo) => {
  all();
  windowsAll();
};

const _onMoved = (tabId: number, moveInfo: chrome.tabs.TabMoveInfo) => {
  all();
  windowsAll();
};

const _onDetached = (tabId: number, detachInfo: chrome.tabs.TabDetachInfo) => {
  all();
  windowsAll();
};

const _onCreated = (tab: chrome.tabs.Tab) => {
  all();
  windowsAll();
};

const _onActivated = (activeInfo: chrome.tabs.TabActiveInfo) => {
  all();
  windowsAll();
};

const _onReplaced = (addedTabId: number, removedTabId: number) => {
  all();
  windowsAll();
};

const _onZoomChange = (zoomChangeInfo: chrome.tabs.ZoomChangeInfo) => {
  all();
  windowsAll();
};

const _onFocusChanged = (windowId: number) => {
  all();
  windowsAll();
};

const stopListenTabs = () => {
  chrome.tabs.onHighlighted.removeListener(_onHighlighted);
  chrome.tabs.onRemoved.removeListener(_onRemoved);
  chrome.tabs.onUpdated.removeListener(_onUpdated);
  chrome.tabs.onAttached.removeListener(_onAttached);
  chrome.tabs.onMoved.removeListener(_onMoved);
  chrome.tabs.onDetached.removeListener(_onDetached);
  chrome.tabs.onCreated.removeListener(_onCreated);
  chrome.tabs.onActivated.removeListener(_onActivated);
  chrome.tabs.onReplaced.removeListener(_onReplaced);
  chrome.tabs.onZoomChange.removeListener(_onZoomChange);
  chrome.windows.onFocusChanged.removeListener(_onFocusChanged);
};

export const startListenTabs = () => {
  stopListenTabs();

  chrome.tabs.onHighlighted.addListener(_onHighlighted);
  chrome.tabs.onRemoved.addListener(_onRemoved);
  chrome.tabs.onUpdated.addListener(_onUpdated);
  chrome.tabs.onAttached.addListener(_onAttached);
  chrome.tabs.onMoved.addListener(_onMoved);
  chrome.tabs.onDetached.addListener(_onDetached);
  chrome.tabs.onCreated.addListener(_onCreated);
  chrome.tabs.onActivated.addListener(_onActivated);
  chrome.tabs.onReplaced.addListener(_onReplaced);
  chrome.tabs.onZoomChange.addListener(_onZoomChange);
  chrome.windows.onFocusChanged.addListener(_onFocusChanged);
};
