import {SObject, SProxy} from "./schema";

export function createTable(obj: SObject) {

    let sql = 'CREATE TABLE IF NOT EXISTS ' + obj.name;

    let fields: string[] = ['id INTEGER PRIMARY KEY AUTOINCREMENT']

    for (let f in obj.fields) {
        let field = obj.fields[f]

        let str = f
        if (field.type == 'number') {
            str += ' INTEGER'
        } else if (field.type == 'string') {
            if (field.length) {
                str += ' VARCHAR(' + field.length + ')'
            } else {
                str += ' TEXT'
            }
        } else if (field.type == 'date') {
            str += ' DATE'
        } else {
            throw new Error('Type not found')
        }

        if (field.default) {
            str += ' DEFAULT ' + field.default
        }

        if (field.null === true) {
            str += ' DEFAULT NULL'
        } else if (field.null === false) {
            str += ' NOT NULL '
        }

        fields.push(str)

    }

    //fields.push('created_at DATE DEFAULT (datetime(\'now\',\'localtime\'))');
    //fields.push('updated_at DATE DEFAULT (datetime(\'now\',\'localtime\'))');

    return sql + '(' + fields.join(',') + ')'
}


const db_queries: Array<{version: string,up: Array<string>,down: Array<string>}> = [
    {
        version: '001',
        up: [
            createTable(SProxy),
            'CREATE UNIQUE INDEX IF NOT EXISTS proxy_ip_port ON proxy (ip4,port)'
        ],
        down: ['DROP INDEX proxy_ip_port', 'DROP TABLE proxy']
    }
]


export default db_queries