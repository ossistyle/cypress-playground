#! /bin/bash

CYPRESS_RECORD="--record false"
if [[ "$CYPRESS_RECORD_KEY" != "" ]]; then
    CYPRESS_RECORD=" --record"
fi

export CYPRESS_RECORD

stat $PWD

id

yarn cypress verify
yarn cypress info
yarn cypress version

rm -r -v -f /report/*

# report dir should exist and be bound to a named volume
if [ -d /home/node/app/cypress/reports ]; then
    cp -r -f /home/node/app/cypress/reports/* /report
fi

exit 0;