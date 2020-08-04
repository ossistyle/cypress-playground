// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add("login", (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add("drag", { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add("dismiss", { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite("visit", (originalFn, url, options) => { ... })
import '@percy/cypress';

Cypress.Commands.add('login', () => {
  cy.request({
    method: 'POST',
    url: '/libs/granite/core/content/login.html/j_security_check',
    body: {
      _charset_: 'utf-8',
      j_username: Cypress.env('USERNAME'),
      j_password: Cypress.env('PASSWORD'),
      j_validate: true,
    },
    headers: {
      Accept: '*/*',
      'Accept-Language': Cypress.env('language'),
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      Cookie:
        'optimizelySegments=%7B%7D; optimizelyEndUserId=oeu1590480147584r0.15586646853518693; optimizelyBuckets=%7B%7D; cq-authoring-mode=TOUCH',
      Host: 'dev-aemsp.ecx.local:4502',
      Origin: 'http://dev-aemsp.ecx.local:4502',
      Referer:
        'http://dev-aemsp.ecx.local:4502/libs/granite/core/content/login.html?resource=%2F&$$login$$=%24%24login%24%24&j_reason=unknown&j_reason_code=unknown',
    },
  }).then((resp) => {
    window.localStorage.setItem('login-token', cy.getCookie('login-token'));
  });
});
