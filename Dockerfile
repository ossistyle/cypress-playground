# Latest Node.js version: https://nodejs.org/en
ARG NODE_VERSION='22.9.0'

# Latest Chrome version: https://www.ubuntuupdates.org/package/google_chrome/stable/main/base/google-chrome-stable
ARG CHROME_VERSION='129.0.6668.100-1'

# Latest Firefox version: https://www.mozilla.org/en-US/firefox/releases/
ARG FIREFOX_VERSION='131.0.2'

ARG CYPRESS_VERSION='13.15.0'

# Latest Yarn version: https://www.npmjs.com/package/yarn
ARG YARN_VERSION='1.22.22'

# Disable other browsers
ARG EDGE_VERSION=

# Latest cypress factory version: https://hub.docker.com/r/cypress/factory/tags
ARG BASE_TEST_IMAGE='cypress/factory:4.2.1'

FROM ${BASE_TEST_IMAGE}

# avoid too many progress messages
# https://github.com/cypress-io/cypress/issues/1243
ENV CI=1

# should be root
RUN id

# move test runner binary folder to the non-root's user home directory
RUN mv /root/.cache /home/node/.cache
# make sure cypress looks in the right place
ENV CYPRESS_CACHE_FOLDER=/home/node/.cache/Cypress

# create report dir
RUN mkdir /report
RUN chown -R node:node /report

# switch user to node - exists by default
USER node

WORKDIR /home/node/app

RUN stat /home/node/app

COPY --chown=node:node ./cypress ./cypress
COPY --chown=node:node ./cypress.config.ts ./cypress.config.ts
COPY --chown=node:node ./package.json ./package.json
COPY --chown=node:node ./tsconfig.json ./tsconfig.json
COPY --chown=node:node ./yarn.lock ./yarn.lock

RUN id

# install dependencies
RUN yarn install