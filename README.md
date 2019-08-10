

# node-proxybroker

[![Build Status](https://travis-ci.org/thinkbaer/node-proxybroker.svg?branch=master)](https://travis-ci.org/thinkbaer/node-proxybroker)
[![codecov](https://codecov.io/gh/thinkbaer/node-proxybroker/branch/master/graph/badge.svg)](https://codecov.io/gh/thinkbaer/node-proxybroker)
[![Dependency Status](https://david-dm.org/thinkbaer/node-proxybroker.svg)](https://david-dm.org/thinkbaer/node-proxybroker)


## Local installation

The proxybroker is implemented as [typexs](https://github.com/typexs/typexs-base) module. 
It's a framework for dynamic module invocation and integration.
To use this implementation create a new directory and install the npm packages.  

```bash
## Create the project directory and change to it
$ mkdir proxy-project && cd proxy-project 

## Initialize npm project
$ npm init -y

## Mark project as typexs project 
$ node -p "JSON.stringify({...require('./package.json'), typexs: {name:'proxy-project'}}, null, 2)" > package.mod.json && \ 
  mv package.mod.json package.json

## Install proxybroker
$ npm install proxybroker

## Create the configuration directory and file
$ mkdir config
$ touch config/typexs.yml
```

Add following content to the config/typexs.yml file:
```yaml
# Configuration 
proxy-broker:
  startup: true
  validator:
    parallel: 50
    judge:
      selftest: true
      remote_lookup: true
      remote_ip: 127.0.0.1
      ip: 0.0.0.0
      request:
        timeout: 5000
  provider:
    startup: true
    parallel: 5

server:
  proxyserver:
    type: proxyserver
    port: 3128
    enable: true
    timeout: 30000
    # limit of search repeats if proxy failed
    repeatLimit: 10
    broker:
      enable: true
      timeouts:
        incoming: 30000
        forward: 2000
    toProxy: true # default rotator will be used



schedules:
  - name: fetch_proxies
    offset: 4h
    # startup: true
    task:
      name:
        - proxy_fetch
      validate: true
      provider: __all__
  - name: revalidate
    offset: 30m
    event:
      name: validator_run_event


workers:
  access:
    - name: TaskQueueWorker
      access: allow

```


## Configuration

The configuration file in directory where module is installed
config/typexs.yml

```yaml

    

proxy-broker:
  startup: true
  validator:
    parallel: 50
    judge:
      selftest: true
      remote_lookup: true
      remote_ip: 127.0.0.1
      ip: 0.0.0.0
      request:
        timeout: 5000
  provider:
    startup: true
    parallel: 5

server:
  proxyserver:
    type: proxyserver
    port: 3128
    enable: true
    timeout: 30000
    # limit of search repeats if proxy failed
    repeatLimit: 10
    broker:
      enable: true
      timeouts:
        incoming: 30000
        forward: 2000
    toProxy: true # default rotator will be used


schedules:
  - name: fetch_proxies
    offset: 4h
    # startup: true
    task:
      name:
        - proxy_fetch
      validate: true
      provider: __all__
  - name: revalidate
    offset: 30m
    event:
      name: validator_run_event


workers:
  access:
    - name: TaskQueueWorker
      access: allow



```


## Usage


### Proxyserver



Command: 
```
typexs server
```



### Fetch proxies

Command: 
```
typexs proxy-fetch [provider] [variant] -f json|csv -validate
```

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

### Validate only


Command: 
```
typexs proxy-validate [string or filename] [-f json|csv] [--store]
```


Examples:
```bash
# Shows proxy variants
> typexs proxy-validate '127.0.0.1:3128'


> typexs proxy-validate '127.0.0.1:3128'
   
```



## Server-mode


## Docker




### Testing 

 curl over proxy
```
$ curl -x http://localhost:3128 -L http://httpbin.org/headers
```


## Notes

* If you running proxybroker locally or behind a NAT enviroment, you must expose the ports 
of the judge instance.
