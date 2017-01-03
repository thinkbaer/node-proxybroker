# Development

## Provider



**Validation routine**

Um zu prüfen, ob die "erwartete" bzw. vorausgesetzte Seitenstruktur noch präsent ist, 
müssen definitiv vorausgesetzte Elemente einer Seite auf das Vorhandensein geprüft werden.
  
  





## Fetching

**Controlled fetched request**

Request by providers must be done over a controlled fetch mechaniscm to prevent an stuck of the application during processing.
The request method can differ in POST, GET, etc. 


## Page Extract Instruction Pipeline


Idea 1:
```
[
{$visit: "http://some.url"},
{$match: "ul > li"}
{$project: {field: "$text"}}
]
```

should return
```
[{field:"data1"},{field:"data2"}]
```
 
Idea 2:
```
[
{$visit: "http://some.url"},
{$match: "ul > li"}
{$project: {field: "http://some.url/id/${text()}"}},
{$follow: "$field"}, // multiple url call async
{$match: "div.content"},
{$project: {title: ".title::text()", content:".text::text()"}},
]
```

should return
```
[{title:"T1", content:"C1"},{title:"T2",content:"C2"}]
``` 
