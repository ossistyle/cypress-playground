import { defineConfig } from 'cypress';
import defu from 'defu';
import defaultConfig from './cypress.config';

export default defineConfig(
  defu(
    {
      e2e: {
        baseUrl: 'http://example.com',
        excludeSpecPattern: [],
      },
      env: {
        grepFilterSpecs: true,
        grepOmitFiltered: true,
      },
    },
    defaultConfig,
  ),
);
