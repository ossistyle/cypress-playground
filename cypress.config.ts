/* eslint-disable @typescript-eslint/naming-convention */
import { defineConfig } from 'cypress';

import cypressGrepPlugin from '@cypress/grep/src/plugin';
import failFast from 'cypress-fail-fast/plugin';

import defu from 'defu';
import e2eDev from './cypress/configs/cypress.dev.config';

const environments = [
  {
    dev: e2eDev,
  },
];
const environment = environments[`${process.env.ENVIRONMENT}`];
export default defineConfig(
  defu(environment, {
    e2e: {
      baseUrl: null,
      supportFile: 'cypress/support/index.{js,jsx,ts,tsx}',
      experimentalRunAllSpecs: true,
      testIsolation: true,
      specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
      reporter: 'cypress-mochawesome-reporter',
      reporterOptions: {
        charts: true,
        reportPageTitle: 'custom-title 4',
        embeddedScreenshots: true,
        inlineAssets: true,
        saveAllAttempts: true,
      },
      env: {
        FAIL_FAST_STRATEGY: 'spec',
        FAIL_FAST_ENABLED: true,
        FAIL_FAST_BAIL: 0,
        grepIntegrationFolder: './',
        grepFilterSpecs: true,
        grepOmitFiltered: true,
      },
      video: true,
      screenshotOnRunFailure: true,
      setupNodeEvents(on, config) {
        cypressGrepPlugin(config);
        failFast(on, config);
        // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
        require('cypress-mochawesome-reporter/plugin')(on);
        return config;
      },
    },
  }),
);
