import * as _ from 'lodash'

import StdConsole from "./StdConsole";
import {Log} from "../lib/logging/Log";
import Todo from "../exceptions/TodoException";
import {ProviderManager} from "../provider/ProviderManager";
import {Utils} from "../utils/Utils";


export class FetchProviderProxyListCommand {

    command = "fetch provider [provider] [variant]";
    aliases = "fp";
    describe = "Retrieve proxies from a <provider> source.";


    builder(yargs: any) {
        return yargs
            .option("verbose", {
                alias: 'v',
                describe: "Enable logging",
                'default': false
            })
            .option('format', {
                alias: 'f',
                describe: "Set outputformat (default: json).",
                'default': 'json',
                demand: true
            })
    }

    async handler(argv: any) {
        Log.enable = StdConsole.$enabled = argv.verbose;
        let manager = new ProviderManager({schedule: {enable: false}});
        await manager.init();
        let provider = null;
        let variant = null;
        let variant_found = null;

        if (argv.provider) {
            let variants = manager.findAll({name: argv.provider});

            if (!_.isEmpty(variants)) {
                provider = argv.provider;

                variants = manager.findAll({name: argv.provider, type: argv.variant});
                if (!_.isEmpty(variants)) {
                    variant = argv.variant;
                    variant_found = variants.shift()
                }
            }
        }

        if (!provider && !variant) {
            let variants = manager.findAll();

            console.log('No provider with this name ' + argv.provider + ' and ' + argv.variant + ' found.');
            console.log('Current list:');

            variants.forEach(_x => {
                console.log('\t- name: ' + _x.name + ';  variant: ' + _x.type + ' on ' + _x.url)
            })


        } else if (provider && !variant) {
            let variants = manager.findAll({name: provider});

            console.log('No variant ' + argv.variant + ' for provider ' + argv.provider + ' found.');
            console.log('Current variant list for ' + argv.provider + ':');

            variants.forEach(_x => {
                console.log('\t- name: ' + _x.name + ';  variant: ' + _x.type + ' on ' + _x.url)
            })

        } else if (provider && variant) {
            let worker = await manager.createWorker(variant_found);
            let p = await worker.fetch();

            switch (argv.format) {
                case 'json':
                    console.log(JSON.stringify(p, null, 2));
                    break;
                case 'csv':
                    let rows: string[] = [];
                    p.forEach(_rowData => {
                        rows.push([_rowData.ip, _rowData.port].join(';'))
                    });
                    rows = Utils.unique_array(rows);
                    console.log(rows.join('\n'));
                    break;
                default:
                    throw new Todo()

            }

        } else {
            throw new Todo()
        }

    }
}