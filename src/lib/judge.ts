import * as http from "http";
import * as request from "request-promise-native";
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

    remote_ip() {
        return this.server_remote_ip
    }

    private async get_remote_accessible_ip(): Promise<any> {
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
    private async selftest(): Promise<boolean> {
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
                Log.log('Self Time: C -> S: ' + c_s + ', S -> C: ' + s_c + ', G:' + full + ' on ' + self.url_remote())
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
    async runTests(proxy: Addr): Promise<any> {
        let start = new Date()
        let report: any = {}
        let self = this

        try {
            let http_url = 'http://' + proxy.ip + ':' + proxy.port

            console.log('ASD1')
            let r = request.defaults({proxy: http_url})


            console.log('ASD2')
            let result = await r.get(self.url_remote())


            console.log('ASD3')
            var s = JSON.parse(result)
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

    async pending(): Promise<any> {
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