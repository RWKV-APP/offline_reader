import { ignoreHref } from '@extension/shared';
import type { State } from '@extension/shared';

export const state: State = {
  interactionMode: 'full',
  demoMode: false,
  ignored: false,
  running: false,
  ignoreHref,
  inspecting: false,
};
