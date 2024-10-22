import { defineConfig } from 'cypress';
import { defu } from 'defu';

import defaultConfig from '../../cypress.config';

// eslint-disable-next-line import/no-unused-modules
export default defineConfig(
  defu(
    {
      env: {
        environment: 'development',
      },
      e2e: {
        baseUrl: 'http://example.com',
      },
    },
    defaultConfig,
  ),
);
