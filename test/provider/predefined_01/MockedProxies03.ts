import {AbstractProvider} from "../../../src/libs/provider/AbstractProvider";
import {IProviderVariant} from "../../../src/libs/provider/IProviderVariant";
import {IProxyData} from "../../../src/libs/proxy/IProxyData";


export class MockedProxies03  extends AbstractProvider {

    url:string = 'http://localhost:8000/tada03';

    name:string = 'mockproxy03';

    variants: IProviderVariant[] = [
        {type: 'https'}
    ];

    get(): Promise<IProxyData[]> {
        return Promise.resolve([{ip: '127.0.0.5', port: 3128}, {ip: '127.0.0.6', port: 3129}])
    }


}
