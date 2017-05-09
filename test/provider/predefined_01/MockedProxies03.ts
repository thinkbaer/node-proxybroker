

import {IProvider} from "../../../src/provider/IProvider";
import {IProviderWorkerAPI} from "../../../src/provider/IProviderWorkerAPI";
import {IProviderVariant} from "../../../src/provider/IProviderVariant";
import {AbstractProvider} from "../../../src/provider/AbstractProvider";


export class MockedProxies03  extends AbstractProvider {

    url:string = 'http://localhost:8000/tada03'

    name:string = 'mockproxy03'

    variants: Array<IProviderVariant> = [
        {type: 'https'}
    ]


    do(api: IProviderWorkerAPI): Promise<void> {return null}

}