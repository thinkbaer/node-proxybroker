import * as http from "http";
import * as request from "request-promise-native";
import {Log} from "./logging";

import * as util from 'util'
import * as url from 'url'
import * as net from 'net'


// interface JudgeConfig


const IPCHECK_URL = 'https://api.ipify.org?format=json'

export class Judge {

    private server: http.Server = null


    private _remote_url: url.Url = null
    private _judge_url: url.Url = null

    private enabled: boolean = false
    private runnable: boolean = false
    private running: boolean = false


    constructor() {
        this._remote_url = url.parse('http://127.0.0.1:8080')
        this._judge_url = url.parse('http://0.0.0.0:8080')

    }


    get remote_url() : url.Url {
        return this._remote_url
    }

    async bootstrap(opts?: any): Promise<boolean> {
        let self = this

        try {
            await this.get_remote_accessible_ip()
            await this.wakeup(true)
            this.runnable = await this.selftest()
            await this.pending()
            return this.runnable
        } catch (err) {
            Log.error(err)
            throw err

        }
    }

    private async get_remote_accessible_ip(): Promise<any> {

        // If IP is fixed, it should be configurable ...
        try {
            let response_data = await request.get(IPCHECK_URL)
            let json = JSON.parse(response_data)
            this._remote_url = url.parse(this._remote_url.protocol+'//'+json.ip+':'+this._remote_url.port)
            Log.info('The accessible remote IP: ' + url.format(this._remote_url))
            return this._remote_url
        } catch (err) {
            Log.error(err)
            throw err
        }
    }

    /**
     *  Check if Judge
     */
    private async selftest(): Promise<boolean> {
        // Startup
        let self = this
        self.runnable = false
        let start = new Date()
        return request.get(url.format(self._remote_url))
            .then((r) => {
                var s = JSON.parse(r)
                var stop = new Date()
                var c_s = s.time - start.getTime()
                var s_c = stop.getTime() - s.time
                var full = stop.getTime() - start.getTime()
                Log.log('Self Time: C -> S: ' + c_s + ', S -> C: ' + s_c + ', G:' + full + ' on ' + url.format(self._remote_url))
                return true
            })
            .catch(err => {
                Log.error(err)
                return false
            })
    }


    /**
     * Judge root callback
     *
     * @param req
     * @param res
     */
    public judge(req: http.IncomingMessage, res: http.ServerResponse) {
        console.log('JUDGE ============== ')
        console.log(util.inspect(req.headers, false, 10))
        console.log(util.inspect(req.connection.remoteAddress, false, 10))
        console.log(util.inspect(req.socket.remoteAddress, false, 10))
        console.log('JUDGE ==== START ')

        if (this.enabled) {
            res.writeHead(200, {"Content-Type": "application/json"});
            var data = {time: (new Date()).getTime(), headers: req.headers, rawHeaders: req.rawHeaders}
            var json = JSON.stringify(data);
            res.end(json);
        } else {
            res.writeHead(404, {"Content-Type": "application/json"});
            var json = JSON.stringify({'404': 'Error'});
            res.end(json);
        }
    }



    enable() {
        this.enabled = true
    }

    disable() {
        this.enabled = false
    }


    async testProxyLevel(): Promise<any> {


    }

    /**
     * Test HTTP, HTTPS, ANONYMITY LEVEL
     *
     * @param proxy
     */
    async runTests(proxy: url.Url): Promise<any> {
        let start = new Date()
        let report: any = {}
        let self = this

        try {
            let http_url = url.format(proxy)
            let r = request.defaults({proxy: http_url, timeout:10000})


            let log : Array<any> = []

            let promise = r.get(url.format(self._remote_url), {resolveWithFullResponse: true})
                .on('connect',function(event:any){console.log('E: connect')})
                .on('end',function(event:any){console.log('E: end')})
                .on('upgrade',function(event:any){console.log('E: upgrade')})
                .on('continue',function(event:any){console.log('E: continue')})
                .on('socket',function(socket:net.Socket){
                    console.log('E: socket')

                    var connectListener = function(){
                        let addr = socket.address()
                        // socket.
                        console.log('E: socket - connected')
                        log.push(`CONNECTED TO ${socket.remoteAddress}:${socket.remotePort}`)
                        socket.removeListener('connect',connectListener)
                    }

                    socket.on('connect',connectListener)
                    socket.on('close',function(){console.log('E: socket - close')})
                    socket.on('end',function(){console.log('E: socket - end')})
                    socket.on('timeout',function(){console.log('E: socket - timeout')})
                    socket.on('lookup',function(){console.log('E: socket - lookup')})
                })
                .on('error',function(event:any){console.log('E: error')})
                .on('close',function(event:any){console.log('E: close')})
                .promise();


            let response = await promise

            console.log('LOG', log )

            var s = JSON.parse(response.body)
            var stop = new Date()
            var c_s = s.time - start.getTime()
            var s_c = stop.getTime() - s.time
            var full = stop.getTime() - start.getTime()

            console.log('Time: C -> S: ' + c_s + ', S -> C: ' + s_c + ', G:' + full);
            report['http'] = {
                start: start,
                stop: stop,
                duration: full,
                success: true,
                log: ''
            }

        } catch (err) {
            Log.error(err)
            var stop = new Date()
            var full = stop.getTime() - start.getTime()
            report['http'] = {
                start: start,
                stop: stop,
                duration: full,
                success: false,
                log: ''
            }
        }
        return report
    }

    async wakeup(force: boolean = false): Promise<any> {
        let self = this
        return new Promise(function (resolve, reject) {
            try {
                if (self.runnable || (!self.runnable && force)) {
                    self.server = http.createServer(self.judge.bind(self))
                    self.server.listen(parseInt(self._judge_url.port), self._judge_url.hostname, function () {
                        self.enable()
                        Log.info('Judge service startup on ' + url.format(self._judge_url))
                        resolve(true)
                    })
                } else {
                    throw new Error('This will not work!')
                }
            } catch (e) {
                reject(e)
            }
        })
    }

    async pending(): Promise<any> {
        let self = this
        return new Promise(function (resolve, reject) {
            try {
                if (self.server) {
                    self.server.close(function () {
                        self.disable()
                        Log.info('Judge service shutting down on ' + url.format(self._judge_url))
                        resolve(true)
                    })
                } else {
                    resolve(false)
                }
            } catch (e) {
                reject(e)
            }
        })

    }
}