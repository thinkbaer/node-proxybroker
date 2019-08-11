#!/usr/bin/env bash

# ./docker-entrypoint-db.sh postgres


if [ "$1" = 'server' ]; then
    /etc/init.d/postgresql start
    cd $PROXYBROKER && ./node_modules/.bin/typexs server
fi

exec "$@"
