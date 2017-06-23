import * as child_process from 'child_process';
import {PlatformUtils} from "../../src/utils/PlatformUtils";

export default class SpawnCLI {

    args:string[]
    stderr:string = ''
    stdout:string = ''
    cwd: string = PlatformUtils.pathNormilize(__dirname + '/../..')


    constructor(...args:string[]){
        args.unshift('src/cli.ts')
        if(!process.env.NYC_PARENT_PID){
            // if not embedded in nyc the register ts
            args.unshift('--require','ts-node/register')
        }
        this.args = args
    }


    exec():Promise<SpawnCLI>{
        let self = this
        let cp:child_process.ChildProcess = null
        return new Promise((resolve, reject) => {
            cp = child_process.spawn('node',this.args,
                {
                    cwd: PlatformUtils.pathNormilize(__dirname + '/../..'),
                    env:process.env
                })
            cp.stdout.on('data',function (data:string) {
                self.stdout += data
            })
            cp.stderr.on('data',function (data:string) {
                console.error(data.toString())
                self.stderr += data
            })
            cp.on('close',function () {
                resolve(self)
            })
            cp.on("error", function (err) {
                reject(err)
            })
        }).then(() =>{
            try{
                cp.kill()
            }catch(e){}
            return self
        }).catch((err) =>{
            try{
                cp.kill()
            }catch(e){}
            return err
        })
    }

    static run(...args:string[]):Promise<SpawnCLI>{
        let spawnCLI = new SpawnCLI(...args)
        return spawnCLI.exec()
    }
}