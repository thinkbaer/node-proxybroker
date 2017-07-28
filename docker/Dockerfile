FROM debian:jessie

ENV NODE_SOURCE=node_6.x

RUN echo 'debconf debconf/frontend select Noninteractive' | debconf-set-selections

RUN apt-get update && \
    apt-get install -y -q --no-install-recommends \
      apt-transport-https \
      curl \
      libpq-dev \
      g++ \
      make \
      ca-certificates

RUN curl --silent https://deb.nodesource.com/gpgkey/nodesource.gpg.key | apt-key add -


RUN echo "deb https://deb.nodesource.com/$NODE_SOURCE jessie main" > /etc/apt/sources.list.d/nodesource.list && \
    echo "deb-src https://deb.nodesource.com/$NODE_SOURCE jessie main" >> /etc/apt/sources.list.d/nodesource.list

# For aios sync socket the c libaries must be compiled

RUN apt-get update && \
    apt-get -y install \
      nodejs

RUN npm -g install \
      mocha \
      gulp \
      typescript \
      nyc \
      codecov

RUN /bin/sh -c 'echo "\n127.0.0.10 judge.local\n" >> /etc/hosts' \
    /bin/sh -c 'echo "127.0.0.11 proxy.local\n" >> /etc/hosts'


# RUN mkdir -p /node_modules
# ENV NPM_CONFIG_PREFIX=/node_modules
# ENV NODE_PATH=/node_modules

VOLUME /opt/proxybroker
VOLUME /data

EXPOSE 32323
EXPOSE 3128
EXPOSE 8080

COPY ./docker-entrypoint.sh /

ENTRYPOINT ["/docker-entrypoint.sh"]