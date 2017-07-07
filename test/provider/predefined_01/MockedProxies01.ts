import {IProviderVariant} from "../../../src/provider/IProviderVariant";
import {AbstractProvider} from "../../../src/provider/AbstractProvider";
import {IProxyData} from "../../../src/proxy/IProxyData";


export class MockedProxies01 extends AbstractProvider {

    url: string = 'http://localhost:8000/tada01'

    name: string = 'mockproxy01'

    variants: IProviderVariant[] = [
        {type: 'anonym'},
        {type: 'https'}
    ]


    get(): Promise<IProxyData[]> {
        return Promise.resolve([{ip: '127.0.0.1', port: 3128}, {ip: '127.0.0.2', port: 3129}])
    }


}