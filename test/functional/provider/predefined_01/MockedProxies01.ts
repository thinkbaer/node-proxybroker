import {AbstractProvider} from "../../../../src/libs/provider/AbstractProvider";
import {IProviderVariant} from "../../../../src/libs/provider/IProviderVariant";
import {IProxyData} from "../../../../src/libs/proxy/IProxyData";


export class MockedProxies01 extends AbstractProvider {

    url: string = 'http://localhost:8000/tada01';

    name: string = 'mockproxy01';

    variants: IProviderVariant[] = [
        {type: 'anonym'},
        {type: 'https'}
    ];


    get(): Promise<IProxyData[]> {
        return Promise.resolve([{ip: '127.0.0.1', port: 3128}, {ip: '127.0.0.2', port: 3129}])
    }


}
