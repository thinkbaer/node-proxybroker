

import {IProxyProvider} from "../../../src/provider/IProxyProvider";
import {IProviderWorkerAPI} from "../../../src/provider/IProviderWorkerAPI";


export class MockedProxies02 implements IProxyProvider {

    url:string = 'http://localhost:8000/tada02'

    name:string = 'mockproxy02'

    type:string = 'http'

    constructor(){}


    do(api: IProviderWorkerAPI, done: Function): void {

        console.log('')
    }

}