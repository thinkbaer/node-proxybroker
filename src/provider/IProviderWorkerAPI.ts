
import {IProxyDef} from "./IProxyDef";
export interface IProviderWorkerAPI {

    /**
     *
     *
     * @param proxy
     */
    propose(proxy: IProxyDef): void;

}