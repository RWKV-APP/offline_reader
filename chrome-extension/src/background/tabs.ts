import { ws } from '.';

const getActiveTabForFocusedWindow = async (): Promise<chrome.tabs.Tab | null> => {
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true, lastFocusedWindow: true });
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

const all = () => {
  getActiveTabForFocusedWindow().then(tab => {
    const data = {
      logic: 'tab_actived',
      tab: { id: tab?.id, url: tab?.url, title: tab?.title, favIconUrl: tab?.favIconUrl },
    };
    console.log({ data });
    ws?.send(JSON.stringify(data));
  });
  getAllTabs().then(tabs => {
    const data = {
      logic: 'tabs_all',
      tabs: tabs.map(tab => ({ id: tab.id, url: tab.url, title: tab.title, favIconUrl: tab.favIconUrl })),
    };
    console.log({ data });
    ws?.send(JSON.stringify(data));
  });
};

const _onHighlighted = (activeInfo: chrome.tabs.TabHighlightInfo) => {
  console.log('Tab highlighted:', activeInfo);
  all();
};

const _onRemoved = (tabId: number, removeInfo: chrome.tabs.TabRemoveInfo) => {
  console.log('Tab removed:', tabId, removeInfo);
  all();
};

const _onUpdated = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
  console.log('Tab updated:', tabId, changeInfo, tab);
  all();
};

const _onAttached = (tabId: number, attachInfo: chrome.tabs.TabAttachInfo) => {
  console.log('Tab attached:', tabId, attachInfo);
  all();
};

const _onMoved = (tabId: number, moveInfo: chrome.tabs.TabMoveInfo) => {
  console.log('Tab moved:', tabId, moveInfo);
  all();
};

const _onDetached = (tabId: number, detachInfo: chrome.tabs.TabDetachInfo) => {
  console.log('Tab detached:', tabId, detachInfo);
  all();
};

const _onCreated = (tab: chrome.tabs.Tab) => {
  console.log('Tab created:', tab);
  all();
};

const _onActivated = (activeInfo: chrome.tabs.TabActiveInfo) => {
  console.log('Tab activated:', activeInfo);
  all();
};

const _onReplaced = (addedTabId: number, removedTabId: number) => {
  console.log('Tab replaced:', addedTabId, removedTabId);
  all();
};

const _onZoomChange = (zoomChangeInfo: chrome.tabs.ZoomChangeInfo) => {
  console.log('Tab zoom changed:', zoomChangeInfo);
  all();
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
};
