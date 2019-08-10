FROM node:10


RUN echo 'debconf debconf/frontend select Noninteractive' | debconf-set-selections

RUN apt-get update && \
    apt-get install -y -q --no-install-recommends \
      apt-transport-https \
      curl \
      libpq-dev \
      g++ \
      make \
      ca-certificates \
      git \
      postgresql && \
    cd /tmp && \
    mkdir -p /proxybroker/config && \
    mkdir -p /proxybroker/log && \
    cd /proxybroker && \
    npm init -y && \
    node -p "JSON.stringify({...require('./package.json'), typexs: {name:'proxy-project'}}, null, 2)" > package.mod.json && \
    mv package.mod.json package.json && \
    npm i proxybroker pg pg-native


VOLUME /proxybroker/config
COPY config /proxyproker/config

# ProxyServer
EXPOSE 3128

# UI (later)
EXPOSE 8080

# POSTGRESQL DB
EXPOSE 5432

COPY ./docker-entrypoint.sh /

ENTRYPOINT ["/docker-entrypoint.sh"]

CMD ["server"]
