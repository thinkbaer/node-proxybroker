import {TodoException} from '@typexs/base';
import * as _ from 'lodash';
import {IProxyData} from './IProxyData';
// import {JobState} from '../../entities/JobState';


export class ProxyDataFetched {

  // jobState: JobState;

  list: IProxyData[] = [];


  constructor(list: IProxyData | IProxyData[] /*, jobState?: JobState*/) {
    //
    // this.jobState = jobState;
    // if (!this.jobState) {
    //   this.jobState = new JobState();
    // }


    if (list) {
      if (_.isArray(list)) {
        this.list = list;
      } else if (list.ip && list.port) {
        this.list.push(list);
      } else {
        throw new TodoException();
      }
    }
  }

}
