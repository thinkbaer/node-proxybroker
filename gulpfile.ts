import * as _ from 'lodash';
import * as glob from 'glob';

_.concat(
  glob.sync('node_modules/@typexs/base/gulp/*'),
  glob.sync('src/gulp/*'),
  glob.sync('gulp/*'),
).filter(x => !/@types\//.test(x))
  .map(x => require('./' + x));

