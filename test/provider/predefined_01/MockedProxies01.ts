import {IProvider} from "../../../src/provider/IProvider";
import {IProviderWorkerAPI} from "../../../src/provider/IProviderWorkerAPI";
import {IProviderVariant} from "../../../src/provider/IProviderVariant";
import {AbstractProvider} from "../../../src/provider/AbstractProvider";


export class MockedProxies01 extends AbstractProvider {

    url: string = 'http://localhost:8000/tada01'

    name: string = 'mockproxy01'

    variants: Array<IProviderVariant> = [
        {type: 'anonym'},
        {type: 'https'}
    ]



    do(api: IProviderWorkerAPI): Promise<void> {
        console.log('')
        return null
    }

}