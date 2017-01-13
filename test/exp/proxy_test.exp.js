var request = require('request-promise')
var http = require('http');

// Lets define a port we want to listen to
const PORT = 8080;

// We need a function which handles requests and send response
function handleRequest(request, response) {
    response.end('It Works!! Path Hit: ' + request.url);
}

// Create a server
var server = http.createServer(handleRequest);

// Lets start our server
server.listen(PORT, '0.0.0.0', function () {
    var host = server.address().address;
    var port = server.address().port;
    console.log('running at http://' + host + ':' + port)
});

var myip = '127.0.0.1'
request.get('https://api.ipify.org?format=json')
    .then(function (data) {
        myip = JSON.parse(data).ip
        let proxy = 'http://212.185.87.53:443'
        console.log('Try ' +'http://' + myip + ':8080/api/judge over ' + proxy)
        var r = request.defaults({proxy: proxy})
        return r.get('http://' + myip + ':8080/api/judge',{resolveWithFullResponse: true})
    })
    .then((t)=>{
        console.log(t.body)
        process.exit()
    })
    .catch((err)=>{
        console.error(err)
        process.exit()

    })






