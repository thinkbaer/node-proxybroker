

# node-proxybroker

[![Build Status](https://travis-ci.org/thinkbaer/node-proxybroker.svg?branch=master)](https://travis-ci.org/thinkbaer/node-proxybroker)
[![codecov](https://codecov.io/gh/thinkbaer/node-proxybroker/branch/master/graph/badge.svg)](https://codecov.io/gh/thinkbaer/node-proxybroker)
[![Dependency Status](https://david-dm.org/thinkbaer/node-proxybroker.svg)](https://david-dm.org/thinkbaer/node-proxybroker)


## Install

```js
npm install -g typexs
npm install proxybroker
```

## Configuration

The configuration file in directory where module is installed
config/typexs.yml

```yaml

proxybroker:
  # enable on startup
  startup: true | false 
  # provider options
  providerOptions:
    


```


## Usage


**start server**


**Fetch proxies**

Command: proxy-fetch [provider] [variant] -f json|csv -validate

* provider - the name of the defined proxy provider
* variant - is the possible different proxy
* -f - output format is default 'json', the other possible value is 'csv'
* -validate - run validation of grabbed data  
* -store - store data also in backend

```bash
# Shows proxy variants
> typexs proxy-fetch

# Scan all proxy variants and return as json (can be piped to json file )
> typexs proxy-fetch __all__

> typexs proxy-fetch __all__ --validate --store


> typexs proxy-fetch __all__ > proxies.json
   
```

**Validate only**


```bash
# Shows proxy variants
> typexs proxy-validate '127.0.0.1:3128'
> typexs proxy-validate '127.0.0.1:3128'
   
```



## Server-mode






### Testing 

 curl over proxy
```
$ curl -x http://localhost:3128 -L http://httpbin.org/headers
```


## Notes

* If you running proxybroker locally or behind a NAT enviroment, you must expose the ports 
of the judge instance.
