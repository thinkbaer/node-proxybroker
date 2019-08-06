#!/bin/sh

NAME=proxybroker
VERSION=dev

set -e

if [ "$1" = 'renew' ]; then
    echo "Recreate container"
    if [ "$(docker ps -aq -f status=exited -f name=$NAME)" ]; then
        # cleanup
        docker rm $NAME
    fi

    docker run --ip $NAME \
           --name $NAME \
           -v $(pwd)/..:/opt/$NAME \
           -v $(pwd)/local:/data \
           -v $(pwd)/config:/etc/$NAME \
           --net=host \
           -it $NAME:$VERSION /bin/bash

#           -p 8080:8080 \
#           -p 127.0.0.1:3128:3128 \
#           -p 127.0.0.1:32323:32323 \

fi

if [ "$1" = 'build' ]; then
    echo "Rebuild image and delete older container"
    docker ps -a | awk '{ print $1,$2 }' | grep $NAME:$VERSION | awk '{print $1 }' | xargs -I {} docker rm {}
    docker build --rm -t $NAME:$VERSION .
fi


if [ "$1" = 'start' ]; then
    docker start -ia $NAME
fi

