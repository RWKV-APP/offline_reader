const getActiveTabForFocusedWindow = async (): Promise<chrome.tabs.Tab | null> => {
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true, lastFocusedWindow: true });
    return activeTab;
  } catch (error) {
    console.error('Error getting active tab:', error);
    return null;
  }
};

const getActiveTabs = async (): Promise<chrome.tabs.Tab[]> => {
  try {
    const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true, lastFocusedWindow: false });
    return activeTabs;
  } catch (error) {
    console.error('Error getting active tab:', error);
    return [];
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

const _onHighlighted = (activeInfo: chrome.tabs.TabHighlightInfo) => {
  console.log('Tab highlighted:', activeInfo);
};

const _onRemoved = (tabId: number, removeInfo: chrome.tabs.TabRemoveInfo) => {
  console.log('Tab removed:', tabId, removeInfo);
};

const _onUpdated = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
  console.log('Tab updated:', tabId, changeInfo, tab);
};

const _onAttached = (tabId: number, attachInfo: chrome.tabs.TabAttachInfo) => {
  console.log('Tab attached:', tabId, attachInfo);
};

const _onMoved = (tabId: number, moveInfo: chrome.tabs.TabMoveInfo) => {
  console.log('Tab moved:', tabId, moveInfo);
};

const _onDetached = (tabId: number, detachInfo: chrome.tabs.TabDetachInfo) => {
  console.log('Tab detached:', tabId, detachInfo);
};

const _onCreated = (tab: chrome.tabs.Tab) => {
  console.log('Tab created:', tab);
};

const _onActivated = (activeInfo: chrome.tabs.TabActiveInfo) => {
  console.log('Tab activated:', activeInfo);
};

const _onReplaced = (addedTabId: number, removedTabId: number) => {
  console.log('Tab replaced:', addedTabId, removedTabId);
};

const _onZoomChange = (zoomChangeInfo: chrome.tabs.ZoomChangeInfo) => {
  console.log('Tab zoom changed:', zoomChangeInfo);
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
