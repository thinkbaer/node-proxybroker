

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

## Tests

```
mocha --opts test/mocha.all.opts
```

