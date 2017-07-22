

# node-proxybroker

[![Build Status](https://travis-ci.org/thinkbaer/node-proxybroker.svg?branch=master)](https://travis-ci.org/thinkbaer/node-proxybroker)
[![codecov](https://codecov.io/gh/thinkbaer/node-proxybroker/branch/master/graph/badge.svg)](https://codecov.io/gh/thinkbaer/node-proxybroker)
[![Dependency Status](https://www.versioneye.com/user/projects/596932d5368b080056357b50/badge.svg?style=flat-square)](https://www.versioneye.com/user/projects/596932d5368b080056357b50)

Under deveploment.


## CLI

from build/package
```
node cli.js judge --ip {ip} --port {port}
```

from .
```
node --require ts-node/register src/cli.ts judge --ip {ip} --port {port}
```

Fetch proxy list from provider in csv format
```
pb$ node --require ts-node/register src/cli.ts fetch provider freeproxylists anonym -f csv -v  > /tmp/proxies_anonym.csv
```

Test proxies from a csv file and return results as csv
```
pb$ node --require ts-node/register src/cli.ts judge-file /tmp/proxies_anonym.csv -f csv -v > /tmp/proxies_anonym_results.csv
```


## Tests

```
mocha --opts test/mocha.all.opts
```


## Startup

```
$ node --require ts-node/register src/cli.ts start -c config/proxybroker.yml
```


### curl over proxy
```
$ curl -x http://localhost:3128 -L http://httpbin.org/headers
```
