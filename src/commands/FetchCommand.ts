import * as _ from 'lodash'

import StdConsole from "./StdConsole";
import {Log} from "../lib/logging/Log";
import Todo from "../exceptions/TodoException";
import {ProviderManager} from "../provider/ProviderManager";
import {Utils} from "../utils/Utils";


export class FetchCommand {

    command = "fetch <provider> [variant]";
    aliases = "fp";
    describe = "Retrieve proxies from a <provider> and optional [variant].";


    builder(yargs: any) {
        return yargs
            .option('format', {
                alias: 'f',
                describe: "Set outputformat (default: json).",
                'default': 'json',
                demand: true
            })
    }

    async handler(argv: any) {

        let manager = new ProviderManager({schedule: {enable: false}});
        await manager.init();
        let provider = null;
        let variant = null;
        let variant_found = null;

        if (argv.provider) {
            let variants = manager.findAll({name: argv.provider});

            if (variants.length == 1) {
                provider = argv.provider;
                // if only one variant then take this
                if (argv.variant) {
                    // test if name is same
                    if (argv.variant === variants[0].type) {
                        variant = argv.variant;
                        variant_found = variants.shift()
                    } else {
                        console.log('Provider with name ' + argv.provider + ' has no variant named ' + argv.variant + '.\n');
                    }
                } else {
                    variant = argv.variant;
                    variant_found = variants.shift()
                }
            } else if (!_.isEmpty(variants)) {
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