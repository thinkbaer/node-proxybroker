FROM debian:stretch-slim

RUN echo 'debconf debconf/frontend select Noninteractive' | debconf-set-selections

#RUN groupadd --gid 1000 node \
#  && useradd --uid 1000 --gid node --shell /bin/bash --create-home node

ENV NODE_VERSION 10.16.2
ENV ARCH x64

ENV POSTGRES_USER proxybroker
ENV POSTGRES_DB proxybroker
ENV PROXYBROKER /proxy-broker


RUN buildDeps='xz-utils' \
    && ARCH= && dpkgArch="$(dpkg --print-architecture)" \
    && case "${dpkgArch##*-}" in \
      amd64) ARCH='x64';; \
      ppc64el) ARCH='ppc64le';; \
      s390x) ARCH='s390x';; \
      arm64) ARCH='arm64';; \
      armhf) ARCH='armv7l';; \
      i386) ARCH='x86';; \
      *) echo "unsupported architecture"; exit 1 ;; \
    esac \
    && mkdir -p /usr/share/man/man1 \
    && mkdir -p /usr/share/man/man7 \
    && mkdir -p /usr/share/dpkg \
    && set -ex \
    && apt-get update -y \
    && apt-get install -y \
        ca-certificates \
        curl \
        wget \
        gnupg \
        dirmngr \
        dpkg-dev \
        python \
        apt-transport-https \
        curl \
        libpq-dev \
        postgresql \
        g++ \
        make \
        $buildDeps --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

RUN for key in \
      94AE36675C464D64BAFA68DD7434390BDBE9B9C5 \
      FD3A5288F042B6850C66B31F09FE44734EB7990E \
      71DCFD284A79C3B38668286BC97EC7A07EDE3FC1 \
      DD8F2338BAE7501E3DD5AC78C273792F7D83545D \
      C4F0DFFF4E8C1A8236409D08E73BC641CC11F4C8 \
      B9AE9905FFD7803F25714661B63B535A4C206CA9 \
      77984A986EBC2AA786BC0F66B01FBB92821C587A \
      8FCCA13FEF1D0C2E91008E09770F7A9A5AE15600 \
      4ED778F539E3634C779C87C6D7062848A1AB005C \
      A48C2BEE680E841632CD4E44F07496B3EB3C1762 \
      B9E2F5981AA6E0CD28160D9FF13993A75599653C \
    ; do \
      gpg --batch --keyserver hkp://p80.pool.sks-keyservers.net:80 --recv-keys "$key" || \
      gpg --batch --keyserver hkp://ipv4.pool.sks-keyservers.net --recv-keys "$key" || \
      gpg --batch --keyserver hkp://pgp.mit.edu:80 --recv-keys "$key" ; \
    done \
    && curl -fsSLO --compressed "https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-$ARCH.tar.xz" \
    && curl -fsSLO --compressed "https://nodejs.org/dist/v$NODE_VERSION/SHASUMS256.txt.asc" \
    && gpg --batch --decrypt --output SHASUMS256.txt SHASUMS256.txt.asc \
    && grep " node-v$NODE_VERSION-linux-$ARCH.tar.xz\$" SHASUMS256.txt | sha256sum -c - \
    && tar -xJf "node-v$NODE_VERSION-linux-$ARCH.tar.xz" -C /usr/local --strip-components=1 --no-same-owner \
    && rm "node-v$NODE_VERSION-linux-$ARCH.tar.xz" SHASUMS256.txt.asc SHASUMS256.txt \
    && apt-get purge -y --auto-remove $buildDeps \
    && ln -s /usr/local/bin/node /usr/local/bin/nodejs

ENV PROXYBROKER_VERSION 0.11.5

RUN mkdir -p /proxy-broker/config && \
    mkdir -p /proxy-broker/data && \
    mkdir -p /proxy-broker/log && \
    cd /proxy-broker && \
    npm init -y && \
    node -p "JSON.stringify({...require('./package.json'), typexs: {name:'proxy-project'}}, null, 2)" > package.mod.json && \
    mv package.mod.json package.json && \
    npm i proxybroker@$PROXYBROKER_VERSION pg pg-native


VOLUME /proxy-broker/config
VOLUME /proxy-broker/log

RUN	chown -R postgres:postgres /proxy-broker/data && \
	chmod 777 /proxy-broker/data

VOLUME /proxy-broker/data




COPY config /proxy-broker/config

# ProxyServer
EXPOSE 3128

# UI (later)
EXPOSE 8080
EXPOSE 8181

# POSTGRESQL DB
EXPOSE 5432


COPY ./docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]

CMD ["server"]
