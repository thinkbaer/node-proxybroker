import * as mocha from 'mocha';
describe('', () => {
})


import {suite, test, slow, timeout, pending} from "mocha-typescript";
import {expect} from "chai";
import {inspect} from 'util'


import subscribe from '../../src/events/decorator/subscribe'
import { EventBus} from "../../src/events/EventBus";
import EventBusMeta from "../../src/events/EventBusMeta";
import {EventChannel} from "../../src/events/EventChannel";


/**
 * Tests todo:
 * - multiple subscriber in one class
 * - subscriber wrong type
 * - subscriber has wrong method
 *
 */

@suite('events/decorator/subscribe')
class EventsSubscribe {

    @test
    async 'channel'() {
        class ChannelSubscriber {
            fire(o: any) {
                expect(o).to.eq('TEST')
            }
        }
        let channel = new EventChannel('test')

        expect(function () {
            channel.register(channel, 'fire')
        }).to.throw()

        let subscriber = new ChannelSubscriber()
        channel.register(subscriber, 'fire')
        expect(channel.size).to.eq(1)

        let res = await channel.post('TEST')
        expect(res.length).to.eq(1)

        channel.unregister(subscriber)
    }


    @test
    'subscribe for single class'() {
        class TestData {
            data: string
        }

        class LocalTest {

            @subscribe(TestData)
            subscribemethod(o: TestData) { }

        }


    }

    @test
    async 'register subscriber and post message'() {

        class TestData2 {
            data: string

            constructor() {
                this.data = 'TESTDATA'
            }
        }

        class LocalTest2 {

            @subscribe(TestData2)
            subscribemethod(o: TestData2) {
                expect(o.data).to.be.eq('TESTDATA')
            }

        }

        EventBus.$()['inc'] = 0
        let l = new LocalTest2()
        EventBus.register(l)
        expect(EventBus.namespaces).to.contain('TestData2')

        let event = new TestData2()
        let info = EventBusMeta.$().getNamespacesForEvent(event)
        expect(info).not.to.be.empty

        await EventBus.post(new TestData2())
        expect(EventBus.$()['inc']).to.eq(1)
        EventBus.unregister(l)
    }

}