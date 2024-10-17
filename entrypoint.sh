#! /bin/bash

RECORD="--record false"
if [[ "$CYPRESS_RECORD_KEY" != "" ]]; then
    RECORD=" --record"
fi

stat $PWD

id

npx cypress verify
npx cypress info
npx cypress version

rm -r /report/*

npm run cy:run -- -q $RECORD $@
status=$?

# report dir should exist and be bound to a named volume
cp -r -v /home/node/app/cypress/reports/* /report

exit $status