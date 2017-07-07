

import {IProviderVariant} from "../../../src/provider/IProviderVariant";
import {AbstractProvider} from "../../../src/provider/AbstractProvider";
import {IProxyData} from "../../../src/proxy/IProxyData";


export class MockedProxies02  extends AbstractProvider {

    url:string = 'http://localhost:8000/tada02'

    name:string = 'mockproxy02'

    variants: IProviderVariant[] = [
        {type: 'http'}
    ]

    get(): Promise<IProxyData[]> {
        return Promise.resolve([{ip: '127.0.0.3', port: 3128}, {ip: '127.0.0.4', port: 3129}])
    }


}