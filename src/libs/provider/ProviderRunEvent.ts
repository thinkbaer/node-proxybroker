import * as _ from 'lodash'

import {IProviderVariantId} from "./IProviderVariantId";


export class ProviderRunEvent {

  variants: IProviderVariantId[] = [];

  constructor(variants: IProviderVariantId | IProviderVariantId[]) {
    if (_.isArray(variants)) {
      this.variants = variants
    } else {
      this.variants = [variants]
    }

  }

  runAll(): boolean {
    return this.variants.length == 0
  }


  /*
  fire():Promise<any> {
      return EventBus.post(this)
  }
  */

}
