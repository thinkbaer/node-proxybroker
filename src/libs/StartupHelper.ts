import {Config} from 'commons-config';


export class StartupHelper {

  static isEnabled() {
    return Config.get('proxy-broker.startup', false);
  }
}
