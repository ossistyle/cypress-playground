import 'cypress-fail-fast';

// load and register the grep feature using "require" function
// https://github.com/cypress-io/cypress/tree/develop/npm/grep
import registerCypressGrep from '@cypress/grep/src/support';

registerCypressGrep();
