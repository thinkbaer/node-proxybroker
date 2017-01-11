import {SProxy} from "./schema";
import {createTable} from "./helper";



const db_queries: Array<{version: string,up: Array<string>,down: Array<string>}> = [
    {
        version: '001',
        up: [
            createTable(SProxy),
            'CREATE UNIQUE INDEX IF NOT EXISTS proxy_ip_port ON proxy (ip4,port)'
        ],
        down: [
            'DROP INDEX proxy_ip_port',
            'DROP TABLE proxy',
            'DROP TABLE variable'
        ]
    }
]


export default db_queries