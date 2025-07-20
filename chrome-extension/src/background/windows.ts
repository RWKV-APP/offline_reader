/* eslint-disable @typescript-eslint/no-unused-vars */
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

const all = () => {
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
};

const _onCreated = (window: chrome.windows.Window) => {
  all();
};

const _onRemoved = (windowId: number) => {
  all();
};

const _onFocusChanged = (windowId: number) => {
  all();
};

const _onBoundsChanged = (window: chrome.windows.Window) => {
  all();
};

const stopListenWindows = () => {
  chrome.windows.onCreated.removeListener(_onCreated);
  chrome.windows.onRemoved.removeListener(_onRemoved);
  chrome.windows.onFocusChanged.removeListener(_onFocusChanged);
  chrome.windows.onBoundsChanged.removeListener(_onBoundsChanged);
};

export const startListenWindows = () => {
  stopListenWindows();

  chrome.windows.onCreated.addListener(_onCreated);
  chrome.windows.onRemoved.addListener(_onRemoved);
  chrome.windows.onFocusChanged.addListener(_onFocusChanged);
  chrome.windows.onBoundsChanged.addListener(_onBoundsChanged);
};
