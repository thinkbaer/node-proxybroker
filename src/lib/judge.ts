import * as http from "http";
import * as request from "request-promise";
import {Log} from "./logging";
import {Addr} from "../module";


// interface JudgeConfig


export class Judge {

    private server: http.Server = null


    private server_remote_ip: string = null

    private judge_protocol: string = 'http'
    private judge_ip: string = '0.0.0.0'
    private judge_port: number = 8080

    private enabled: boolean = false
    private runnable: boolean = false
    private running: boolean = false


    constructor() {

    }

    bootstrap(opts?: any):Promise<any> {
        let self = this
        return Promise.resolve()
            .then(() => {
                return self.get_remote_accessible_ip()
            })
            .then(() => {
                return self.wakeup(true)
            })
            .then(() => {
                return self.selftest()
            })
            .then((res) => {
                self.runnable = res
                return self.pending()
            })
            .then((res) => {
                return self.runnable
            })
            .catch(err => {
                Log.error(err)
                throw err
            })
    }


    private get_remote_accessible_ip(): Promise<any> {
        let self = this
        // If IP is fixed, it should be configurable ...
        return request.get('https://api.ipify.org?format=json')
            .then(function (data) {
                let json = JSON.parse(data)
                self.server_remote_ip = json.ip
                Log.info('The accessible remote IP: ' + self.server_remote_ip)
                return self.server_remote_ip
            })
            .catch(function (err) {
                Log.error(err)
                throw err
            })
    }

    /**
     *  Check if Judge
     */
    private selftest() : Promise<boolean>{
        // Startup
        let self = this
        self.runnable = false
        let start = new Date()
        return request.get(self.url_remote())
            .then((r) => {
                var s = JSON.parse(r)
                var stop = new Date()
                var c_s = s.time - start.getTime()
                var s_c = stop.getTime() - s.time
                var full = stop.getTime() - start.getTime()
                Log.log('Time: C -> S: ' + c_s + ', S -> C: ' + s_c + ', G:' + full)
                return true
            })
            .catch(err => {
                Log.error(err)
                return false
            })
    }

    public judge(req: http.IncomingMessage, res: http.ServerResponse) {
        if (this.enabled) {
            res.writeHead(200, {"Content-Type": "application/json"});
            var data = {time: (new Date()).getTime()}
            var json = JSON.stringify(data);
            res.end(json);
        } else {
            res.writeHead(404, {"Content-Type": "application/json"});
            var json = JSON.stringify({'404': 'Error'});
            res.end(json);
        }
    }

    public url() {
        return this.judge_protocol + '://' + this.judge_ip + ':' + this.judge_port
    }

    public url_remote() {
        return this.judge_protocol + '://' + this.server_remote_ip + ':' + this.judge_port
    }


    enable() {
        this.enabled = true

    }

    disable() {
        this.enabled = false
    }

    /**
     * Test HTTP, HTTPS, ANONYMITY LEVEL
     *
     * @param proxy
     */
    runTests(proxy: Addr): Promise<any> {
        //
        let self = this
        let http_url = 'http://' + proxy.ip + ':' + proxy.port
        let report:any = {}
        var r = request.defaults({proxy: http_url})

        let start = new Date()
        return r.get(self.url_remote())
            .then((r) => {
                var s = JSON.parse(r)
                var stop = new Date()
                var c_s = s.time - start.getTime()
                var s_c = stop.getTime() - s.time
                var full = stop.getTime() - start.getTime()
                console.log('Time: C -> S: ' + c_s + ', S -> C: ' + s_c + ', G:' + full);
                report['http'] = {
                    start: start,
                    stop:stop,
                    duration: full,
                    success: true,
                    log: ''
                }
                return true
            })
            .catch(err=>{
                Log.error(err)
                var stop = new Date()
                var full = stop.getTime() - start.getTime()
                report['http'] = {
                    start: start,
                    stop:stop,
                    duration: full,
                    success: false,
                    log: ''
                }

                return false
            })
            .then(() => {
                return report
            })
    }

    wakeup(force: boolean = false): Promise<any> {
        let self = this
        return new Promise(function (resolve, reject) {
            try {
                if (self.runnable || (!self.runnable && force)) {
                    self.server = http.createServer(self.judge.bind(self))
                    self.server.listen(self.judge_port, self.judge_ip, function () {
                        self.enable()
                        Log.info('Judge service startup on ' + self.url())
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

    pending(): Promise<http.Server> {
        let self = this
        return new Promise(function (resolve, reject) {
            try {
                if (self.server) {
                    self.server.close(function () {
                        self.disable()
                        Log.info('Judge service shutting down on ' + self.url())
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