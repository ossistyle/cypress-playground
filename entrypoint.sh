#! /bin/bash

RECORD="--record false"
if [[ "$CYPRESS_RECORD_KEY" != "" ]]; then
    RECORD=" --record"
fi

stat $PWD

id

yarn cypress verify
yarn cypress info
yarn cypress version

rm -r /report/*

# report dir should exist and be bound to a named volume
cp -r -v /home/node/app/cypress/reports/* /report

exit 0;