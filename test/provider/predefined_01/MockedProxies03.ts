


import {IProviderWorkerAPI} from "../../../src/provider/IProviderWorkerAPI";
import {IProviderVariant} from "../../../src/provider/IProviderVariant";
import {AbstractProvider} from "../../../src/provider/AbstractProvider";
import {IProxyDef} from "../../../src/provider/IProxyDef";


export class MockedProxies03  extends AbstractProvider {

    url:string = 'http://localhost:8000/tada03'

    name:string = 'mockproxy03'

    variants: IProviderVariant[] = [
        {type: 'https'}
    ]

    get(): Promise<IProxyDef[]> {
        console.log('')
        return null
    }


    do(api: IProviderWorkerAPI): Promise<void> {return null}

}