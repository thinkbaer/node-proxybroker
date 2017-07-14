import * as mocha from 'mocha';
describe('', () => {
});


import {suite, test, slow, timeout, pending} from "mocha-typescript";
import {expect} from "chai";
import {LevelDetection} from "../../src/judge/LevelDetection";
import DomainUtils from "../../src/utils/DomainUtils";
import {Log} from "../../src/lib/logging/Log";


@suite('judge/LevelDetection')
class JudgeRequestScoring {

    static before() {
        Log.options({enable: false});
        DomainUtils.reloadHosts()
    }

    static after() {
        DomainUtils.HOSTS = []
    }

    @test
    async 'level 1 detection'() {
        let level = 1;
        let proxy_ip = '127.0.0.11';
        let local_ip = '127.0.0.1';

        let detect = new LevelDetection(proxy_ip, local_ip);
        await detect.prepare();
        detect.addRecvHeader({
            host: '222.222.222.222', // Will be ignored
        });
        await detect.detect();
        expect(detect.level).to.be.eq(level);
        expect(detect.hasForwardHeader()).to.be.false;
        expect(detect.hasLocalIP()).to.be.false;
        expect(detect.hasViaHeader()).to.be.false;
        expect(detect.hasProxyIP()).to.be.false;

        proxy_ip = 'proxy.local';
        local_ip = 'localhost';

        detect = new LevelDetection(proxy_ip, local_ip);
        await detect.prepare();
        detect.addRecvHeader({
            host: '222.222.222.222', // Will be ignored
        });
        await detect.detect();
        expect(detect.level).to.be.eq(level);
        expect(detect.hasForwardHeader()).to.be.false;
        expect(detect.hasLocalIP()).to.be.false;
        expect(detect.hasViaHeader()).to.be.false;
        expect(detect.hasProxyIP()).to.be.false

    }

    @test
    async 'level 2 detection'() {
        let level = 2;
        let proxy_ip = '127.0.0.11';
        let local_ip = '127.0.0.1';

        let detect = new LevelDetection(proxy_ip, local_ip);
        await detect.prepare();
        detect.addRecvHeader({
            host: '222.222.222.222', // Will be ignored
            via: 'ProxyServer ' + proxy_ip,
        });
        await detect.detect();
        expect(detect.level).to.be.eq(level);
        expect(detect.hasForwardHeader()).to.be.false;
        expect(detect.hasLocalIP()).to.be.false;

        proxy_ip = 'proxy.local';
        local_ip = 'localhost';

        detect = new LevelDetection(proxy_ip, local_ip);
        await detect.prepare();
        detect.addRecvHeader({
            host: '222.222.222.222', // Will be ignored
            via: 'ProxyServer ' + proxy_ip,
        });
        await detect.detect();

        expect(detect.level).to.be.eq(level);
        expect(detect.hasForwardHeader()).to.be.false;
        expect(detect.hasLocalIP()).to.be.false

    }


    @test
    async 'level 3 detection'() {
        let proxy_ip = '127.0.0.11';
        let local_ip = '127.0.0.1';

        let detect = new LevelDetection(proxy_ip, local_ip);
        await detect.prepare();
        detect.addRecvHeader({
            host: '222.222.222.222', // Will be ignored
            via: 'ProxyServer ' + proxy_ip,
            'x-forwarded-for': local_ip,
        });
        await detect.detect();
        expect(detect.level).to.be.eq(3);
        expect(detect.hasForwardHeader()).to.be.true;
        expect(detect.hasLocalIP()).to.be.true;

        proxy_ip = 'proxy.local';
        local_ip = 'localhost';

        detect = new LevelDetection(proxy_ip, local_ip);
        await detect.prepare();
        detect.addRecvHeader({
            host: '222.222.222.222', // Will be ignored
            via: 'ProxyServer ' + proxy_ip,
            'x-forwarded-for': local_ip,
        });
        await detect.detect();

        expect(detect.level).to.be.eq(3);
        expect(detect.hasForwardHeader()).to.be.true;
        expect(detect.hasLocalIP()).to.be.true

    }
}
