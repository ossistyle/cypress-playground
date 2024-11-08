import 'cypress-fail-fast';

// load and register the grep feature using "require" function
// https://github.com/cypress-io/cypress/tree/develop/npm/grep
// import registerCypressGrep from '@cypress/grep/src/support';

// registerCypressGrep();

// if you want to use the "import" keyword
// note: `./index.d.ts` currently extends the global Cypress types and
// does not define `registerCypressGrep` so the import path is directly
// pointed to the support file
// eslint-disable-next-line import/no-extraneous-dependencies
import registerCypressGrep from '@bahmutov/cy-grep/src/support';

registerCypressGrep();
