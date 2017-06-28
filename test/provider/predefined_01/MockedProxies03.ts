


import {IProviderWorkerAPI} from "../../../src/provider/IProviderWorkerAPI";
import {IProviderVariant} from "../../../src/provider/IProviderVariant";
import {AbstractProvider} from "../../../src/provider/AbstractProvider";
import {IProxyData} from "../../../src/proxy/IProxyData";


export class MockedProxies03  extends AbstractProvider {

    url:string = 'http://localhost:8000/tada03'

    name:string = 'mockproxy03'

    variants: IProviderVariant[] = [
        {type: 'https'}
    ]

    get(): Promise<IProxyData[]> {
        console.log('')
        return null
    }


    do(api: IProviderWorkerAPI): Promise<void> {return null}

}