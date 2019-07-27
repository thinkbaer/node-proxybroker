import {Event} from 'commons-eventbus/decorator/Event';
import {ProxyDataFetched} from '../libs/proxy/ProxyDataFetched';

@Event()
export class ProxyDataFetchedEvent extends ProxyDataFetched {

}
