/// <reference types="cypress" />
// ***********************************************************
// This example plugins/index.js can be used to load plugins
//
// You can change the location of this file or turn off loading
// the plugins file with the 'pluginsFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/plugins-guide
// ***********************************************************

// This function is called when a project is opened or re-opened (e.g. due to
// the project's config changing)
let percyHealthCheck = require('@percy/cypress/task');

/**
 * @type {Cypress.PluginConfig}
 */
module.exports = (on, config) => {
  on('task', percyHealthCheck);
  // `on` is used to hook into various events Cypress emits
  // `config` is the resolved Cypress config
  /* const tmpConfig = config.env;

  const file = process.env.ENVIRONMENT || 'development';
  const envConfig = getConfigurationByFile(file);
  config.env = Object.assign({}, envConfig, tmpConfig);
  config.env.environment = process.env.ENVIRONMENT;
  config.env.language = process.env.LANGUAGE;
  return config; */
};

// promisified fs module
/* const fs = require('fs-extra');
const path = require('path');

function getConfigurationByFile(file) {
  const pathToConfigFile = path.resolve('cypress', 'config', `${file}.json`);

  return fs.outputJsonSync(pathToConfigFile);
} */
