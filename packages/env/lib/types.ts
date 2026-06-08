import type { dynamicEnvValues } from './index.js';

interface ICebEnv {
  readonly CEB_DEV_LOCALE: string;
  readonly CEB_CI: string;
}

interface ICebCliEnv {
  readonly CLI_CEB_DEV: string;
  readonly CLI_CEB_FIREFOX: string;
}

export type EnvType = ICebEnv & ICebCliEnv & typeof dynamicEnvValues;
