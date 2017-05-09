

import {IProvider} from "../../../src/provider/IProvider";
import {IProviderWorkerAPI} from "../../../src/provider/IProviderWorkerAPI";
import {IProviderVariant} from "../../../src/provider/IProviderVariant";
import {AbstractProvider} from "../../../src/provider/AbstractProvider";


export class MockedProxies02  extends AbstractProvider {

    url:string = 'http://localhost:8000/tada02'

    name:string = 'mockproxy02'

    variants: Array<IProviderVariant> = [
        {type: 'http'}
    ]

    do(api: IProviderWorkerAPI): Promise<void> {
        return null
    }

}