import {suite, test} from 'mocha-typescript';
import {expect} from 'chai';
import * as _ from 'lodash';
import {subscribe} from 'commons-eventbus/decorator/subscribe';
import {Log} from '@typexs/base';
import {EventBus} from 'commons-eventbus';
import {ProxyDataFetchedEvent} from '../../../src/libs/proxy/ProxyDataFetchedEvent';
import {IProviderOptions} from '../../../src/libs/provider/IProviderOptions';
import {ProviderManager} from '../../../src/libs/provider/ProviderManager';
import {TestHelper} from '../TestHelper';
import {Job} from '../../../src/entities/Job';
import {ProxyFilter} from '../../../src/libs/proxy/ProxyFilter';
import {ProviderRunEvent} from '../../../src/libs/provider/ProviderRunEvent';
import {JobState} from '../../../src/entities/JobState';
import {MockedProxies01} from './predefined_01/MockedProxies01';
import {MockedProxies02} from './predefined_01/MockedProxies02';
import {MockedProxies03} from './predefined_01/MockedProxies03';

class X {
  test: Function;

  constructor(t: Function) {
    this.test = t;
  }

  @subscribe(ProxyDataFetchedEvent)
  _test(p: ProxyDataFetchedEvent) {
    this.test(p);
  }
}


@suite('provider/ProviderManager')
class ProviderManagerTest {

  options: IProviderOptions = {
    // enable: true,
    schedule: {enable: false}
  };

  static before() {
    Log.options({enable: false});
  }

  @test
  async 'init with directory containing provider classes'() {

    const storage = await TestHelper.getDefaultStorageRef();

    const pm = new ProviderManager();
    pm.addProviderClass(MockedProxies01);
    pm.addProviderClass(MockedProxies02);
    pm.addProviderClass(MockedProxies03);
    await pm.prepare(storage, this.options, true);
    expect(pm.providers.length).to.eq(4);
    let providers = pm.findAll();
    expect(providers.length).to.eq(4);
    providers = pm.findAll({name: 'mockproxy02'});
    expect(providers.length).to.eq(1);
    expect(providers[0].type).to.eq('http');
    expect(providers[0].url).to.eq('http://localhost:8000/tada02');

    providers = pm.findAll({type: 'https'});
    expect(providers.length).to.eq(2);
    providers.forEach(_x => {
      expect(_x.type).to.eq('https');
    });

    providers = pm.findAll({type: 'https', name: 'mockproxy03'});
    expect(providers.length).to.eq(1);
    expect(providers[0].name).to.eq('mockproxy03');

    await pm.shutdown();
  }


  @test
  async 'find explicit provider and instance a worker'() {

    const storage = await TestHelper.getDefaultStorageRef();

    const pm = new ProviderManager();
    pm.addProviderClass(MockedProxies01);
    pm.addProviderClass(MockedProxies02);
    pm.addProviderClass(MockedProxies03);
    await pm.prepare(storage, this.options);

    const providers = pm.findAll({name: 'mockproxy02'});
    expect(providers.length).to.eq(1);

    const provider = providers.shift();
    const worker = await pm.createWorker(provider);
    expect(worker).to.exist;
    await pm.shutdown();
  }

  @test
  async 'initialize with storage'() {

    const storage = await TestHelper.getDefaultStorageRef();

    const pm = new ProviderManager();
    pm.addProviderClass(MockedProxies01);
    pm.addProviderClass(MockedProxies02);
    pm.addProviderClass(MockedProxies03);
    await pm.prepare(storage, this.options, true);
    await pm.shutdown();
    expect(pm.jobs.length).to.eq(4);
    expect(_.some(pm.jobs, <any>{
      name: 'mockproxy01',
      type: 'anonym',
      enabled: true,
      active: true,
      data: {url: 'http://localhost:8000/tada01'}
    })).to.be.true;
    expect(_.some(pm.jobs, <any>{
      name: 'mockproxy02',
      type: 'http',
      enabled: true,
      active: true,
      data: {url: 'http://localhost:8000/tada02'}
    })).to.be.true;
    expect(_.some(pm.jobs, <any>{
      name: 'mockproxy03',
      type: 'https',
      enabled: true,
      active: true,
      data: {url: 'http://localhost:8000/tada03'}
    })).to.be.true;

    const c = await storage.connect();
    const jobs = await c.manager.find(Job);
    expect(jobs.length).to.eq(4);
    expect(_.some(jobs, <any>{
      name: 'mockproxy01',
      type: 'anonym',
      enabled: true,
      active: true,
      data: {url: 'http://localhost:8000/tada01'}
    })).to.be.true;
    expect(_.some(jobs, <any>{
      name: 'mockproxy02',
      type: 'http',
      enabled: true,
      active: true,
      data: {url: 'http://localhost:8000/tada02'}
    })).to.be.true;
    expect(_.some(jobs, <any>{
      name: 'mockproxy03',
      type: 'https',
      enabled: true,
      active: true,
      data: {url: 'http://localhost:8000/tada03'}
    })).to.be.true;

    await c.close();
    await storage.shutdown();
  }


  @test
  async 'run a job'() {

    const storage = await TestHelper.getDefaultStorageRef();

    const pm = new ProviderManager();
    pm.addProviderClass(MockedProxies01);
    pm.addProviderClass(MockedProxies02);
    pm.addProviderClass(MockedProxies03);

    const pds = new ProxyFilter(storage);
    await pds.prepare();
    await pm.prepare(storage, this.options, true);

    const jobState = await pm.do({name: 'mockproxy01', type: 'anonym'});
    const jobState2 = _.clone(jobState);
    expect(jobState2.id).to.eq(1);
    expect(jobState2.count).to.eq(2);
    expect(jobState2.selected).to.eq(2);
    expect(jobState2.added).to.eq(0);

    await pds.await();
    expect(jobState.id).to.eq(1);
    expect(jobState.count).to.eq(2);
    expect(jobState.selected).to.eq(2);
    expect(jobState.added).to.eq(2);

    await pm.shutdown();
    await pds.shutdown();
    await storage.shutdown();

  }


  @test
  async 'run by job event'() {

    const storage = await TestHelper.getDefaultStorageRef();
    const pm = new ProviderManager();
    pm.addProviderClass(MockedProxies01);
    await pm.prepare(storage, this.options, true);


    const event = new ProviderRunEvent({name: 'mockproxy01', type: 'anonym'});
    // event.fire();
    await EventBus.post(event);
    await TestHelper.wait(100);
    await pm.await();

    const c = await storage.connect();
    const jobsStates = await c.manager.find(JobState);

    expect(jobsStates.shift()).to.deep.include({
      count: 2,
      selected: 0,
      id: 1,
      name: 'mockproxy01',
      type: 'anonym'
    });

    await c.close();
    await pm.shutdown();
    await storage.shutdown();
  }

  /**
   * Test schedule process
   *
   */
  @test
  async 'schedule'() {
    const now = Date.now();

    const storage = await TestHelper.getDefaultStorageRef();

    const sec = new Date(now + 2000);
    const options: IProviderOptions = {
      // providers: [__dirname + '/predefined_01/MockedProxies01.*'],
      schedule: {
        enable: true,
        pattern: `${sec.getSeconds()} ${sec.getMinutes()} ${sec.getHours()} * * *`
      },
    };

    let inc = 0;
    const _X = new X((y: ProxyDataFetchedEvent) => {
      inc++;
      expect(y.list).to.deep.include({ip: '127.0.0.1', port: 3128});
      expect(y.list).to.deep.include({ip: '127.0.0.2', port: 3129});
      expect(y.jobState).to.deep.include({count: 2});
    });
    await EventBus.register(_X);

    const pm = new ProviderManager();
    pm.addProviderClass(MockedProxies01);
    // pm.addProviderClass(MockedProxies02);
    // pm.addProviderClass(MockedProxies03);
    await pm.prepare(storage, options, true);

    let offset = pm.next.getTime() - (new Date()).getTime();
    expect(offset).to.be.lessThan(2000);

    await TestHelper.waitFor(() => inc >= 2, 50, 100);

    offset = pm.next.getTime() - (new Date()).getTime();
    expect(offset).to.be.greaterThan(23 * 60 * 60 * 1000);

    await pm.await();
    await pm.shutdown();
    await storage.shutdown();

    expect(inc).to.be.eq(2);

    await EventBus.unregister(_X);
  }

}
