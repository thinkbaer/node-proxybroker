

import {IProxyProvider} from "../../../src/provider/IProxyProvider";
import {IProviderWorkerAPI} from "../../../src/provider/IProviderWorkerAPI";


export class MockedProxies01 implements IProxyProvider {

    url:string = 'http://localhost:8000/tada01'

    name:string = 'mockproxy01'

    type:string = 'anonym'

    constructor(){}


    do(api: IProviderWorkerAPI, done: Function): void {

        console.log('')
    }

}