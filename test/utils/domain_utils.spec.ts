import * as mocha from 'mocha';


import {suite, test, slow, timeout, pending} from "mocha-typescript";
import {expect} from "chai";
import {inspect} from 'util'

import {ClassLoader} from "../../src/libs/generic/utils/ClassLoader";
import DomainUtils from "../../src/libs/generic/utils/DomainUtils";

@suite('utils/DomainUtils')
class DomainUtilsTest {

    @test
    'host file load'(){
        DomainUtils.reloadHosts();
        let hosts = DomainUtils.getHostsSync();
        expect(hosts).to.deep.include({host:'localhost',ip:'127.0.0.1'});


        // works only if the hostnames are set, @see .travis.yml
        expect(hosts).to.deep.include({host:'judge.local',ip:'127.0.0.10'});
        expect(hosts).to.deep.include({host:'proxy.local',ip:'127.0.0.11'});
        DomainUtils.HOSTS = []
    }

    @test
    async 'reverse'(){

        let hosts = await DomainUtils.reverse('127.0.0.10');
        expect(hosts).to.be.empty;
        DomainUtils.reloadHosts();

        hosts = await DomainUtils.reverse('127.0.0.10');
        expect(hosts).to.deep.include('judge.local');
        DomainUtils.HOSTS = []
    }

}
