#!/bin/bash
# set -e

if [ "$1" = 'server' ]; then
    cd /proxybroker && ./node_modules/.bin/typexs server
fi

exec "$@"
