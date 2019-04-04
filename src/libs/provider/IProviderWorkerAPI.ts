
import {IProxyData} from "../proxy/IProxyData";
export interface IProviderWorkerAPI {

    /**
     *
     *
     * @param proxy
     */
    propose(proxy: IProxyData): void;

}