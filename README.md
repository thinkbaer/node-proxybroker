

# node-proxybroker

![build status](https://travis-ci.org/thinkbaer/node-proxybroker.svg?branch=master)
[![codecov](https://codecov.io/gh/thinkbaer/node-proxybroker/branch/master/graph/badge.svg)](https://codecov.io/gh/thinkbaer/node-proxybroker)

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

