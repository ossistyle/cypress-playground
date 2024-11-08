// eslint-disable-next-line import/no-extraneous-dependencies
import cypressGrepPlugin from '@bahmutov/cy-grep/src/plugin';
import { defineConfig } from 'cypress';
import failFast from 'cypress-fail-fast/plugin';

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      failFast(on, config);
      // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
      require('cypress-mochawesome-reporter/plugin')(on);

      cypressGrepPlugin(config);

      return config;
    },
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
    },

    video: true,
    screenshotOnRunFailure: true,
  },
});
