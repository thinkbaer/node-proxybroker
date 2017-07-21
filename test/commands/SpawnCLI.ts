import * as child_process from 'child_process';
import {PlatformUtils} from "../../src/utils/PlatformUtils";
import Timer = NodeJS.Timer;

export default class SpawnCLI {


    static timeout: number = 10000;
    args: string[];
    stderr: string = '';
    stdout: string = '';
    cwd: string = PlatformUtils.pathNormalize(__dirname + '/../..');


    constructor(...args: string[]) {
        args.unshift('src/cli.ts');
        if (!process.env.NYC_PARENT_PID) {
            // if not embedded in nyc the register ts
            args.unshift('--require', 'ts-node/register')
        }
        this.args = args
    }


    exec(): Promise<SpawnCLI> {
        let timer: Timer
        let self = this;
        let cp: child_process.ChildProcess = null;
        return new Promise((resolve, reject) => {
            cp = child_process.spawn('node', this.args, {
                cwd: PlatformUtils.pathNormalize(__dirname + '/../..'),
                env: process.env
            });

            cp.stdout.on('data', function (data: string) {
                // console.log('out=' + data)
                self.stdout += data;
            });
            cp.stderr.on('data', function (data: string) {
                // console.log('err='+data)
                self.stderr += data;
            });
            cp.on('close', function (code) {
                resolve(self);
            });
            cp.on("error", function (err) {
                reject(err)
            })
            timer = setTimeout(function () {
                if (cp) {
                    console.error('KILLED BY TIMEOUT');
                    cp.kill();
                }
                resolve(self);

            }, SpawnCLI.timeout)
        }).then(() => {
            clearTimeout(timer)
            try {
                cp.kill();
                cp = null;
            } catch (e) {
            }
            return self
        }).catch((err) => {
            clearTimeout(timer);
            try {
                cp.kill();
                cp = null;
            } catch (e) {
            }
            return err;
        })
    }

    static run(...args: string[]): Promise<SpawnCLI> {
        let spawnCLI = new SpawnCLI(...args);
        return spawnCLI.exec();
    }
}