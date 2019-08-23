// import {expect} from 'chai';
// import * as _ from 'lodash';
// import {suite, test, timeout} from 'mocha-typescript';
// import {Config} from 'commons-config';
// import {TestHelper} from '../TestHelper';
// import {AsyncWorkerQueue, Bootstrap, C_STORAGE_DEFAULT, Container, ITypexsOptions, Log, StorageRef} from '@typexs/base';
// import {ServerRegistry} from '@typexs/server';
// import {TasksHelper} from '@typexs/base/libs/tasks/TasksHelper';
// import {TN_PROXY_FETCH} from '../../../src/libs/Constants';
// import {HttpFactory} from 'commons-http';
// import {IpAddrState} from '../../../src/entities/IpAddrState';
//
//
// const LOG_EVENT = TestHelper.logEnable(true);
//
// let bootstrap: Bootstrap = null;
//
//
// @suite('functional/masstest/masstest')
// @timeout(20000000)
// class MasstestSpec {
//
//
//   async before() {
//     // TestHelper.typeOrmRestore();
//     Bootstrap.reset();
//     Config.clear();
//
//     bootstrap = Bootstrap
//       .setConfigSources([{type: 'system'}])
//       .configure(<ITypexsOptions & any>{
//         app: {name: 'test', nodeId: 'system', path: __dirname + '/fake_app'},
//         logging: {
//           enable: LOG_EVENT, level: 'debug',
//           loggers: [{name: '*', level: 'debug', enable: LOG_EVENT}]
//         },
//         modules: {paths: [__dirname + '/../../..']},
//         storage: {
//           default: {
//             type: 'postgres',
//             database: 'proxybroker',
//             username: 'proxybroker',
//             port: 5432,
//             synchronize: true,
//             extra: {
//               max: 100
//             }
//           }
//         },
//         'proxy-broker': {
//           startup: true,
//           validator: {
//             parallel: 50,
//             judge: {
//               selftest: true,
//               remote_lookup: true,
//               remote_ip: '127.0.0.1',
//               ip: '0.0.0.0',
//               request:
//                 {timeout: 5000}
//             }
//           },
//           provider: {
//             startup: true,
//             parallel: 5
//           }
//         },
//         server: {
//           proxyserver: {
//             type: 'proxyserver',
//             port: 3128,
//             enable: true,
//             timeout: 30000,
//             repeatLimit: 10,
//             broker: {
//               enable: true,
//               timeouts: {
//                 incoming: 30000,
//                 forward: 2000
//               }
//             },
//             toProxy: true
//           }
//         }
//       });
//     bootstrap.activateLogger();
//     bootstrap.activateErrorHandling();
//
//     // let d = getMetadataArgsStorage();
//
//     await bootstrap.prepareRuntime();
//     bootstrap = await bootstrap.activateStorage();
//     bootstrap = await bootstrap.startup();
//
//     const registry = Container.get(ServerRegistry);
//     await registry.get('proxyserver').start();
//
//     const storageRef: StorageRef = Container.get(C_STORAGE_DEFAULT);
//     const c = await storageRef.connect();
//     await c.manager.getRepository(IpAddrState).delete({});
//     await c.close();
//   }
//
//
//
//   async after() {
//     if (bootstrap) {
//       const registry = Container.get(ServerRegistry);
//       await registry.get('proxyserver').stop();
//       await bootstrap.shutdown();
//     }
//   }
//
//
//   @test
//   async 'masstest'() {
//
//     // const storageRef: StorageRef = Container.get(C_STORAGE_DEFAULT);
//     // const c = await storageRef.connect();
//     // const count = await c.manager.getRepository(IpAddrState).count({where: {enabled: true}});
//     // await c.close();
//     //
//
//     const resultss = await TasksHelper.exec([TN_PROXY_FETCH], {
//       skipTargetCheck: false,
//       provider: 'proxylistende',
//       validate: true,
//       store: true
//     });
//
//     const stats = {
//       success: 0,
//       error: 0,
//       count: 0,
//       duration: 0,
//       duration_avg: 0,
//       codes: {}
//     };
//
//
//     const http = HttpFactory.create();
//     const q = new AsyncWorkerQueue<any>({
//       async do(workLoad: any) {
//         stats.count++;
//         try {
//           const start = new Date();
//           await http.get('https://example.com', {proxy: 'http://127.0.0.1:3128', timeout: 10000});
//           stats.success++;
//           stats.duration = Date.now() - start.getTime();
//           stats.duration_avg = stats.duration / stats.count;
//         } catch (e) {
//           stats.error++;
//           if (_.has(e, 'statusCode')) {
//             const x = _.get(e, 'statusCode');
//             if (!stats.codes[x]) {
//               stats.codes[x] = 0;
//             }
//             stats.codes[x]++;
//           }
//         }
//
//       }
//     }, {concurrent: 50, name: ''});
//
//     _.range(0, 200).map(() => {
//       q.push({});
//     });
//
//
//     await q.await();
//
//     Log.debug('stats', stats);
//     expect(stats.count).to.be.eq(200);
//
//
//   }
//
//
// }
//
