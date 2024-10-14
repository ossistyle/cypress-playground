#! /bin/bash

CYPRESS_ENVIRONMENT_STRING="dev|stage|preprod"
CYPRESS_ENVIRONMENT_ARRAY=(${CYPRESS_ENVIRONMENT_STRING//|/ })
USAGE_MESSAGE="Usage: docker-compose run -e CYPRESS_ENVIRONMENT=<${CYPRESS_ENVIRONMENT_STRING}> SERVICE"

if [[ ! "$CYPRESS_ENVIRONMENT" ]]; then
    echo "CYPRESS_ENVIRONMENT is not set or empty"
    echo "${USAGE_MESSAGE}"
    exit 1;
fi

case $CYPRESS_ENVIRONMENT in
    ${CYPRESS_ENVIRONMENT_ARRAY}) ;;
    *)
        echo $USAGE_MESSAGE
        exit 1;
esac

RECORD="--record false"
if [[ "$CYPRESS_RECORD_KEY" != "" ]]; then
    RECORD=" --record"
fi

# should be root user
echo "current user: $(whoami)"
#npx cypress verify
npx cypress info
npx cypress version

echo "Running tests on ${CYPRESS_ENVIRONMENT}"
read -p "Press any key to continue... " -n1 -s
# run cypress tests
#npm run cy:verify
npm run cy:$CYPRESS_ENVIRONMENT:run -- $RECORD $@
status=$?

# report dir should exist and be bound to a named volume
echo "copying cypress/reports/* to /report..."
cp -r cypress/reports/* /report

exit $status