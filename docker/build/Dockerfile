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
    git clone https://github.com/thinkbaer/node-proxybroker.git && \
    npm i -g typescript \
      @typexs/base \
      gulp && \
    cd /tmp/node-proxybroker && \
    npm i && \
    gulp package && \
    mv build/package /proxybroker && \
    cd /proxybroker  && \
    npm i && \
    mkdir config





VOLUME /proxybroker/config
COPY config /proxyproker/config

EXPOSE 3128
EXPOSE 80
EXPOSE 5432

COPY ./docker-entrypoint.sh /

ENTRYPOINT ["/docker-entrypoint.sh"]
