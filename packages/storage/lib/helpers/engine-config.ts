import type { ExtensionEngineConfig } from '../base/index.js';

export const DEFAULT_EXTENSION_ENGINE_API_BASE_URL = 'http://127.0.0.1:52345';
export const LEGACY_EXTENSION_ENGINE_API_BASE_URLS = ['http://127.0.0.1:8080'] as const;
export const BUILTIN_EXTENSION_ENGINE_API_BASE_URLS = [
  DEFAULT_EXTENSION_ENGINE_API_BASE_URL,
  ...LEGACY_EXTENSION_ENGINE_API_BASE_URLS,
] as const;

export const DEFAULT_EXTENSION_ENGINE_CONFIG: ExtensionEngineConfig = {
  apiBaseUrl: DEFAULT_EXTENSION_ENGINE_API_BASE_URL,
  requestTimeoutMs: 30000,
  transport: 'openai-local',
};

export const normalizeApiBaseUrl = (value: string) => {
  const trimmed = value.trim();

  if (trimmed === '') {
    return DEFAULT_EXTENSION_ENGINE_CONFIG.apiBaseUrl;
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    url.pathname = '';
    url.search = '';
    url.hash = '';

    return url.toString().replace(/\/$/, '');
  } catch {
    return DEFAULT_EXTENSION_ENGINE_CONFIG.apiBaseUrl;
  }
};

export const getPortFromApiBaseUrl = (apiBaseUrl: string) => {
  try {
    const url = new URL(normalizeApiBaseUrl(apiBaseUrl));

    if (url.port !== '') {
      return Number(url.port);
    }

    return url.protocol === 'https:' ? 443 : 80;
  } catch {
    return null;
  }
};
