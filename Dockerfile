
# Latest Node.js version: https://nodejs.org/en
ARG NODE_VERSION='20.18.0'

# Latest Chrome version: https://www.ubuntuupdates.org/package/google_chrome/stable/main/base/google-chrome-stable
ARG CHROME_VERSION='129.0.6668.100-1'

# Latest Firefox version: https://www.mozilla.org/en-US/firefox/releases/
ARG FIREFOX_VERSION='131.0.2'
ARG CYPRESS_VERSION='13.15.0'

# Disable other browsers
ARG EDGE_VERSION=
ARG YARN_VERSION=

# Latest cypress factory version: https://hub.docker.com/r/cypress/factory/tags
ARG BASE_TEST_IMAGE='cypress/factory:4:2:1'

FROM ${BASE_TEST_IMAGE}

RUN echo "current user: $(whoami)"

# Latest NPM version: https://www.npmjs.com/package/npm
ARG NPM_VERSION="10.9.0"

#USER root

RUN [ "$(npm --version)" = "${NPM_VERSION}" ] || npm install --verbose -g npm@${NPM_VERSION}

WORKDIR /cypress-docker

COPY ./tsconfig.json .
COPY ./package-lock.json .
COPY ./package.json .
COPY ./cypress.config.ts .
COPY ./cypress .
COPY ./entrypoint.sh .
COPY ./cypress-secrets.env .

# avoid too many progress messages
# https://github.com/cypress-io/cypress/issues/1243
ENV CI=1

RUN npm ci --verbose

ENTRYPOINT ["./entrypoint.sh"]