import { readFileSync } from 'node:fs';
import type { ManifestType } from '@extension/shared';

const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));

const manifest = {
  manifest_version: 3,
  default_locale: 'zh_CN',
  name: '__MSG_extensionName__',
  version: packageJson.version,
  description: '__MSG_extensionDescription__',
  host_permissions: ['<all_urls>'],
  permissions: ['storage', 'tabs'],
  background: {
    service_worker: 'background.js',
    type: 'module',
  },
  action: {
    default_popup: 'popup/index.html',
    default_icon: 'icon-34.png',
  },
  icons: {
    '128': 'icon-128.png',
  },
  content_scripts: [
    {
      matches: ['http://*/*', 'https://*/*', '<all_urls>'],
      js: ['content/all.iife.js'],
    },
    {
      matches: ['http://*/*', 'https://*/*', '<all_urls>'],
      js: ['content-ui/all.iife.js'],
    },
    {
      matches: ['http://*/*', 'https://*/*', '<all_urls>'],
      css: ['content.css'],
    },
  ],
  web_accessible_resources: [
    {
      resources: ['icon-128.png', 'icon-34.png'],
      matches: ['*://*/*'],
    },
    {
      resources: ['content/*_dev.js', 'content-ui/*_dev.js'],
      matches: ['http://*/*', 'https://*/*', '<all_urls>'],
    },
  ],
} satisfies ManifestType;

export default manifest;
