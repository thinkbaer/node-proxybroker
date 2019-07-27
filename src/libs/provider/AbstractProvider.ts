import * as _ from 'lodash'
import {IProvider} from "./IProvider";
import {IProviderVariant} from "./IProviderVariant";
import {IProxyData} from "../proxy/IProxyData";


export abstract class AbstractProvider implements IProvider {

  abstract readonly name: string;

  abstract readonly url: string;

  abstract readonly variants: IProviderVariant[];

  private _variant: IProviderVariant = null;

  private _proxyies: IProxyData[] = [];

  constructor() {
  }

  selectVariant(variant: IProviderVariant | string) {
    // TODO check if exists and is valid
    if (_.isString(variant)) {
      this._variant = _.find(this.variants, x => x.type == variant)
    } else {
      this._variant = variant
    }
  }

  prepare?(): Promise<void>;


  get variant(): IProviderVariant {
    return this._variant
  }

  get proxies(): IProxyData[] {
    return this._proxyies
  }

  push(def: IProxyData) {
    let found = _.find(this._proxyies, def);
    if (!found) {
      this._proxyies.push(def)
    }
  }

  abstract get(): Promise<IProxyData[]>;


  // abstract do(api: IProviderWorkerAPI): Promise<void>;

}
