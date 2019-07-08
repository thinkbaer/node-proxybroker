export const K_PROVIDER = 'provider';

export interface IProviderOptions {

  // enable : boolean

//    providers? : StringOrFunction[]

  schedule?: {
    enable?: boolean
    pattern?: string
  }


  /**
   * Amount of parallel allowed worker jobs
   */
  parallel?: number
}

/*
const DEFAULT_PROVIDER: StringOrFunction[] = [
    FreeProxyListsCom, ProxyListenDe
];
*/

export const DEFAULT_PROVIDER_OPTIONS: IProviderOptions = {

  schedule: {
    enable: true,
    pattern: `${(new Date()).getMinutes() + 1} ${(new Date()).getHours()} * * *`
  },


  //providers: DEFAULT_PROVIDER
};

