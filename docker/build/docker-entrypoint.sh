#!/usr/bin/env bash

# ./docker-entrypoint-db.sh postgres

if [ ! -f "/proxy-broker/data/PG_VERSION" ]; then
    /etc/init.d/postgresql stop
    chown -R postgres:postgres /proxy-broker/data
    chmod 700 /proxy-broker/data

    mv /var/lib/postgresql/9.6/main/* /proxy-broker/data

    sed  "s+'/var/lib/postgresql/9.6/main'+'/proxy-broker/data'+g" /etc/postgresql/9.6/main/postgresql.conf > /etc/postgresql/9.6/main/postgresql.2.conf
    mv /etc/postgresql/9.6/main/postgresql.2.conf /etc/postgresql/9.6/main/postgresql.conf

    echo "" > /etc/postgresql/9.6/main/pg_hba.conf
    echo "local all all  trust" >> /etc/postgresql/9.6/main/pg_hba.conf
    echo "host all all 127.0.0.1/32 trust" >> /etc/postgresql/9.6/main/pg_hba.conf


    /etc/init.d/postgresql start
    su - postgres -c 'createuser proxybroker'
    su - postgres -c 'createdb proxybroker'
    su - postgres -c "psql -c 'grant all privileges on database proxybroker to proxybroker;'"
    /etc/init.d/postgresql stop
fi

if [ "$1" = 'server' ]; then
    /etc/init.d/postgresql start
    cd /proxy-broker && ./node_modules/.bin/typexs server
fi

exec "$@"
