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

3. Change the corresponding values, if you want to record to the cypress cloud

## Build Docker:

1. Run `docker build -t cypress/docker:v1 .`

### Override Cypress Version

1. Run `docker build --build-arg CYPRESS_VERSION=13.11.0 -t cypress/docker:v1 .`

## Run Docker Service

1. Run smoke tests on dev envirnment

   `docker-compose run -e CYPRESS_ENVIRONMENT="dev" smoke-chrome`

### Docker Services

1. smoke-chrome
2. regression-chrome
3. e2e-chrome

#### Extend

4. Install [Microsoft Visual Studio Code IDE](https://code.visualstudio.com). Ignore this if already installed.
5. Install [Nodejs](https://nodejs.org/) on your system. Ignore this if already installed.
6. Install [Git](https://git-scm.com/download/) on your system. Ignore this if already installed.
7. `git clone git@github.ibm.com:Thomas-Hoffmann2/cypress-typescript-template.git` or download `master` branch zip and extract code.
8. Open project folder with VSCode.
9. Run `npm install` command to restore all packages.
10. Run `npm run cypress:test` command to run test.

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
