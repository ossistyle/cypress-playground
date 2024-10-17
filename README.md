# Owner

[Thomas Hoffmann](https://ibm-ixorange.slack.com/team/W93V4KPHS)

# Cypress Sample

Cypress automation framework skeleton with Typescript + ESlint + Prettier + Docker/Docker-Compose.

## Prerequisites

1. NodeJs
2. Git
3. Docker

## Prepare

1. Create file `cypress-secrets.env`
2. Add to the file

```
CYPRESS_RECORD_KEY=
CYPRESS_PROJECT_ID=
```

3. Change the corresponding values, if you want to record the test runs to the Cypress Cloud

## Run all at once

1. Run `docker-compose -f docker-compose.dev.yml up --remove-orphans -d --build --force-recreate`

2. Install [Microsoft Visual Studio Code IDE](https://code.visualstudio.com). Ignore this if already installed.
3. Install [Nodejs](https://nodejs.org/) on your system. Ignore this if already installed.
4. Install [Git](https://git-scm.com/download/) on your system. Ignore this if already installed.
5. `git clone git@github.ibm.com:Thomas-Hoffmann2/cypress-typescript-template.git` or download `master` branch zip and extract code.
6. Open project folder with VSCode.
7. Run `npm install` command to restore all packages.
8. Run `npm run cypress:test` command to run test.

## New Setup:

1. Install [Microsoft Visual Studio Code IDE](https://code.visualstudio.com). Ignore this if already installed.
2. Install [Nodejs](https://nodejs.org/) on your system. Ignore this if already installed.
3. Install [Git](https://git-scm.com/download/) on your system. Ignore this if already installed.
4. Open project folder with VSCode.
5. Run `npm init -y` command to initilized project.
6. Run `npm install cypress --save-dev` command to install cypress.
7. Run `npm install typescript --save-dev` command to install typescript.
8. Run `npx tsc --init --types cypress --lib dom,es6` command to configure typescript.
9. Run `npx cypress open` command to run test.

## References:

- [Cypress Overview](https://docs.cypress.io/guides/overview/why-cypress).
- [Cypress Typescript Support](https://docs.cypress.io/guides/tooling/typescript-support).
- [Cypress Configuration](https://docs.cypress.io/guides/references/configuration)
- [Writing and Organizing Tests](https://docs.cypress.io/guides/core-concepts/writing-and-organizing-tests)
- [Cypress with TypeScript](https://www.youtube.com/watch?v=1nuPwejrnJc).
