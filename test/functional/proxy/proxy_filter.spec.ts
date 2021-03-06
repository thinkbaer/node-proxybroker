// import {suite, test} from 'mocha-typescript';
// import {expect} from 'chai';
// import {Log, StorageRef} from '@typexs/base';
// import {EventBus} from 'commons-eventbus';
// import {subscribe} from 'commons-eventbus/decorator/subscribe';
// import {TestHelper} from '../TestHelper';
// import {ProxyFilter} from '../../../src/libs/proxy/ProxyFilter';
// import {IpAddr} from '../../../src/entities/IpAddr';
// import {ProxyDataFetched} from '../../../src/libs/proxy/ProxyDataFetched';
// import {ProxyDataValidateEvent} from '../../../src/event/ProxyDataValidateEvent';
// import {ProxyDataFetchedEvent} from '../../../src/event/ProxyDataFetchedEvent';
//
//
// let storage: StorageRef = null;
//
// @suite('proxy/proxy_filter')
// class ProxyDataSelectorTest {
//
//   static before() {
//     Log.options({enable: false});
//   }
//
//   async before() {
//
//     storage = await TestHelper.getDefaultStorageRef();
//   }
//
//   async after() {
//     await storage.shutdown();
//   }
//
//   @test
//   async 'init'() {
//     const proxy_data_selector = new ProxyFilter(storage);
//     expect(proxy_data_selector).to.exist;
//   }
//
//
//   @test
//   async 'verify if validation is necessary'() {
//
//     const proxy_data_selector = new ProxyFilter(storage);
//     const c = await storage.connect();
//
//     let p = new IpAddr();
//     p.ip = '192.0.0.1';
//     p.port = 3129;
//     p.last_checked_at = new Date();
//     await c.save(p);
//
//     let events = await proxy_data_selector.do(new ProxyDataFetched([
//       {ip: '192.0.0.1', port: 3129},
//       {ip: '127.0.1.1', port: 3128}
//     ]));
//
//     expect(events.length).to.be.eq(1);
//     expect(events[0].fired).to.be.true;
//     expect(events[0].data.results).to.be.null;
//     expect(events[0].data.ip).to.eq('127.0.1.1');
//     expect(events[0].data.port).to.eq(3128);
//
//
//     p.last_checked_at = new Date((new Date()).getTime() - 36 * 60 * 60 * 1000);
//     await c.save(p);
//
//     events = await proxy_data_selector.do(new ProxyDataFetched([
//       {ip: '192.0.0.1', port: 3129},
//       {ip: '127.0.0.1', port: 3128}
//     ]));
//     expect(events.length).to.be.eq(2);
//
//     expect(events[1].data).to.include({
//       results: null,
//       ip: '127.0.0.1',
//       port: 3128
//     });
//
//     // Test subscribe if the events are fired
//     class X01 {
//       _test: Function = null;
//
//       constructor(test: Function) {
//         this._test = test;
//       }
//
//       @subscribe(ProxyDataValidateEvent)
//       test(p: ProxyDataValidateEvent) {
//         this._test(p);
//       }
//     }
//
//     const _q: ProxyDataValidateEvent[] = [];
//     const x01 = new X01(function (e: ProxyDataValidateEvent) {
//       _q.push(e);
//     });
//
//     EventBus.register(x01);
//     await proxy_data_selector.do(new ProxyDataFetched([{ip: '192.0.0.1', port: 3129}]));
//     EventBus.unregister(x01);
//
//     /*
//             expect(_q[0].record).to.deep.include({
//                 id: 1,
//                 ip: '192.0.0.1',
//                 port: 3129,
//                 blocked: false
//             });
//     */
//
//     // Test blocked or to_delete flags
//     p = new IpAddr();
//     p.ip = '192.0.0.2';
//     p.port = 3129;
//     p.blocked = true;
//     await c.save(p);
//
//     p = new IpAddr();
//     p.ip = '192.0.0.3';
//     p.port = 3129;
//     p.to_delete = true;
//     await c.save(p);
//
//     events = await proxy_data_selector.do(new ProxyDataFetched([{ip: '192.0.0.2', port: 3129}, {
//       ip: '192.0.0.3',
//       port: 3129
//     }]));
//     expect(events.length).to.eq(0);
//
//   }
//
//
//   @test
//   async 'filter'() {
//     const addr = {ip: '127.0.0.1', port: 3128};
//
//     class ProxyDataSelectorFilterTest extends ProxyFilter {
//       test: Function;
//
//       constructor(storage: StorageRef, cb: Function) {
//         super(storage);
//         this.test = cb;
//       }
//
//       async do(workLoad: ProxyDataFetched): Promise<any> {
//         this.test(workLoad);
//       }
//     }
//
//
//     let _q: ProxyDataFetched = null;
//     let proxy_data_selector = new ProxyDataSelectorFilterTest(storage, (w: ProxyDataFetched) => {
//       _q = w;
//     });
//
//
//
//     let e = new ProxyDataFetchedEvent(addr);
//     await proxy_data_selector.filter(e);
//     await TestHelper.waitFor(() => _q != null);
//     expect(_q.list).to.deep.eq([addr]);
//     _q = null;
//
//     e = new ProxyDataFetchedEvent([addr]);
//     await proxy_data_selector.filter(e);
//     await TestHelper.waitFor(() => _q != null);
//     expect(_q.list).to.deep.eq([addr]);
//     _q = null;
//
//     let _r = false;
//     proxy_data_selector = new ProxyDataSelectorFilterTest(storage, (w: ProxyDataFetched) => {
//       _r = true;
//     });
//
//     // should be ignored
//     e = new ProxyDataFetchedEvent([{ip: '999.999.999.999', port: 3128}]);
//     proxy_data_selector.filter(e);
//     await proxy_data_selector.queue.await();
//     expect(_r).to.be.false;
//
//     // should be ignored
//     e = new ProxyDataFetchedEvent([{ip: '127.0.0.1', port: 65537}]);
//     proxy_data_selector.filter(e);
//     await proxy_data_selector.queue.await();
//     expect(_r).to.be.false;
//
//
//     proxy_data_selector = new ProxyDataSelectorFilterTest(storage, (w: ProxyDataFetched) => {
//       _q = w;
//     });
//
//     e = new ProxyDataFetchedEvent([
//       {ip: '127.0.0.1', port: 65537},
//       {ip: '127.0.1.1', port: 65530},
//       {ip: '999.999.999.999', port: 3128}
//     ]);
//     proxy_data_selector.filter(e);
//     await proxy_data_selector.queue.await();
//     expect(_q.list).to.deep.eq([{ip: '127.0.1.1', port: 65530}]);
//
//   }
//
// }
