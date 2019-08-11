import {DEFAULT_JUDGE_OPTIONS, IJudgeOptions} from '../judge/IJudgeOptions';


export interface IProxyValidatiorOptions {

  parallel?: number;

  logDirectory?: string;

  revalidate?: {

    time_distance: number;

    limit: number;
  };

  /**
   * Do not save failed proxies
   */
  skipFailed?: boolean;

  // schedule: IScheduleDef;

  judge?: IJudgeOptions;
}


const hours6 = 6 * 60 * 60;

export const DEFAULT_VALIDATOR_OPTIONS: IProxyValidatiorOptions = {

  parallel: 50,

  skipFailed: true,

  judge: DEFAULT_JUDGE_OPTIONS,

  revalidate: {

    time_distance: 4 * 60 * 60,

    limit: 1000
  }


};
