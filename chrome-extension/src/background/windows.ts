import { ws } from '.';
import { tabsAll } from './tabs';

const getActiveWindow = async (): Promise<chrome.windows.Window | null> => {
  try {
    return await chrome.windows.getCurrent();
  } catch (error) {
    console.error('Error getting active window:', error);
    return null;
  }
};

const getAllWindows = async (): Promise<chrome.windows.Window[]> => {
  try {
    return await chrome.windows.getAll();
  } catch (error) {
    console.error('Error getting all windows:', error);
    return [];
  }
};

export const windowsAll = () => {
  try {
    getActiveWindow().then(window => {
      const id = window?.id;
      const left = window?.left;
      const top = window?.top;
      const width = window?.width;
      const height = window?.height;
      const state = window?.state;
      const type = window?.type;
      const focused = window?.focused;
      const tabs = window?.tabs;
      tabsAll(tabs ?? []);
      const data = {
        logic: 'window_actived',
        window: { id, left, top, width, height, state, type, focused },
      };
      ws?.send(JSON.stringify(data));
    });
    getAllWindows().then(windows => {
      const data = {
        logic: 'windows_all',
        windows: windows.map(window => {
          const id = window.id;
          const left = window.left;
          const top = window.top;
          const width = window.width;
          const height = window.height;
          const state = window.state;
          const type = window.type;
          const focused = window.focused;
          const tabs = window.tabs;
          tabsAll(tabs ?? []);
          return { id, left, top, width, height, state, type, focused, tabs };
        }),
      };
      ws?.send(JSON.stringify(data));
    });
  } catch (error) {
    console.error('Error getting all windows:', error);
  }
};

const _onCreated = (window: chrome.windows.Window) => {
  console.log('onCreated', window);
  windowsAll();
};

const _onRemoved = (windowId: number) => {
  console.log('onRemoved', windowId);
  windowsAll();
};

const _onFocusChanged = (windowId: number) => {
  console.log('onFocusChanged', windowId);
  windowsAll();
};

const stopListenWindows = () => {
  chrome.windows.onCreated.removeListener(_onCreated);
  chrome.windows.onRemoved.removeListener(_onRemoved);
  chrome.windows.onFocusChanged.removeListener(_onFocusChanged);
};

export const startListenWindows = () => {
  stopListenWindows();

  chrome.windows.onCreated.addListener(_onCreated);
  chrome.windows.onRemoved.addListener(_onRemoved);
  chrome.windows.onFocusChanged.addListener(_onFocusChanged);
};
