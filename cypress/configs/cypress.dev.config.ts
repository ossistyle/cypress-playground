const env: Partial<Cypress.ConfigOptions<any>> = {
  e2e: {
    baseUrl: 'http://example.com',
    env: {
      FAIL_FAST_STRATEGY: 'run',
    },
    setupNodeEvents(on, config) {
      return config;
    },
  },
};

export default env;
