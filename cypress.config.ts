// eslint-disable-next-line import/no-extraneous-dependencies
import cypressGrepPlugin from '@bahmutov/cy-grep/src/plugin';
import { defineConfig } from 'cypress';
import failFast from 'cypress-fail-fast/plugin';

export default defineConfig({
  env: {
    // FAIL_FAST_STRATEGY: 'spec',
  },
  e2e: {
    reporter: 'cypress-mochawesome-reporter',
    reporterOptions: {
      embeddedScreenshots: true,
    },
    setupNodeEvents(on, config) {
      failFast(on, config);
      cypressGrepPlugin(config);
      // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
      require('cypress-mochawesome-reporter/plugin')(on);

      return config;
    },
    baseUrl: null,
    video: true,
  },
});
