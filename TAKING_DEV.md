# Development

## ProxyServer

Funktionsweisen:

- Zufällige Adressedaten für einen/mehrere Proxy bei Anfrage erhalten (schnellster Proxy; )
  bsp.: GET /api/proxy
  
- Als echter ProxyServer, also Anfragen werden über die vorhandenen Adressen umgeleitet (mit caching / oder ohne)
  Was muss dafür unterstützt werden? (RFC)
 
  
## ProxySelector 

Im Hintergrund Prüfung der Proxies nach Zuverlässigkeit


## ProxyFetcher

Aktuellste Proxies von unterschiedlichen Quellen holen und aktualisieren.

Als separater Task oder als Hintergrundjob ausführbar.


## Provider

**Validation routine**

Um zu prüfen, ob die "erwartete" bzw. vorausgesetzte Seitenstruktur noch präsent ist, 
müssen definitiv vorausgesetzte Elemente einer Seite auf das Vorhandensein geprüft werden.
  

## Fetching

**Controlled fetched request**

Request by providers must be done over a controlled fetch mechaniscm to prevent an stuck of the application during processing.
The request method can differ in POST, GET, etc. 


## ProxyBroker API

Hinzufügen von neuen Proxies:

```
var proxyDecl = PB.api().addProxy({ip:'some ip', port:8888})
proxyDecl.check(function(data){
    // check data
    // - latancy
    // - country
    // - types
    // - last check
    // - errors
    
})
```

Zugriff auf Proxies:

```
var proxyDecl = PB.api().get('some_ip:8888')

var proxyDecls = PB.api().find('some_ip:8888')
```


Fetcher definition:
```
var proxyFetchJob = PB.api().fetcher('some_url','http')
proxyFetchJob.scrapJob(function(api, param, done){

    // user/predefined job to extract proxies from external content 
    
    request.get('some_url').then(function(html){     
       var c = $('.proxydata',html)       
        api.addProxy({ip:c.find('.ip').text(), port:c.find('.port').text()})        
        done()
    })

})
```

## Worker 

Jobs für die Aktualisierung der Proxies einplanen und ausführen. Hierbei werden die Jobs angestossen, 
während der Verarbeitung werden gefundene Proxies erkannt und zurückgeliefert. Diese müssen zugleich (oder später) verifiziert werden und 
geprüft, ob es sich um qualitativ gute Proxies handelt.


CLI: fetch
  -> Worker (4) 
    # Start jobs {parameterized}
    # - Jobs müssen definiert werden (mit Häufigkeit der Wiederholungen) 
    ->* JobInstance
       -> adding Proxies -> Inform. verifier
         
         
  -> Verifier 
       * Queue <- adding Proxies
       | 
  

## Frontend

+ per express und angular


## ProxyServer


## DB

### Issue

 * Aktuell wird nur sqlite als DB unterstützt, soll jedoch irgendwann abstrahiert werden, um beliebige backends zu ermöglichen
 

## Spinoff's

 - Page Extract Instruction Pipeline (extract_pipeline)

