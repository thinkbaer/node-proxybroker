

import {IProxyProvider} from "../../../src/provider/IProxyProvider";
import {IProviderWorkerAPI} from "../../../src/provider/IProviderWorkerAPI";


export class MockedProxies03 implements IProxyProvider {

    url:string = 'http://localhost:8000/tada03'

    name:string = 'mockproxy03'

    type:string = 'https'

    constructor(){}


    do(api: IProviderWorkerAPI, done: Function): void {

        console.log('')
    }

}