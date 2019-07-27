import * as _ from 'lodash';
import * as glob from 'glob';

_.concat(
  glob.sync('node_modules/@typexs/base/gulp/*.js'),
  glob.sync('src/gulp/*.ts'),
  glob.sync('gulp/*.ts'),
).filter(x => !/@types\//.test(x))
  .map(x => {
    require('./' + x);
  });

