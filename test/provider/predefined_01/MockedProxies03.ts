

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
        return Promise.resolve([{ip: '127.0.0.5', port: 3128}, {ip: '127.0.0.6', port: 3129}])
    }


}