/* eslint-disable @typescript-eslint/naming-convention */
import { defineConfig } from 'cypress';

import cypressGrepPlugin from '@cypress/grep/src/plugin';
import failFast from 'cypress-fail-fast/plugin';

export default defineConfig({
  e2e: {
    baseUrl: null,
    supportFile: 'cypress/support/index.{js,jsx,ts,tsx}',
    experimentalRunAllSpecs: true,
    testIsolation: true,
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    env: {
      FAIL_FAST_STRATEGY: 'spec',
      FAIL_FAST_ENABLED: true,
      FAIL_FAST_BAIL: 1,
      grepIntegrationFolder: './',
      // grepFilterSpecs: true,
      grepOmitFiltered: true,
    },
    setupNodeEvents(on, config) {
      cypressGrepPlugin(config);
      failFast(on, config);
      return config;
    },
  },
});
