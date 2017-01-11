import {SObject} from "./schema";

export function createTable(obj: SObject) {

    let sql = 'CREATE TABLE IF NOT EXISTS ' + obj.name;

    let fields: string[] = []

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

        if (field.pk) {
            str += ' PRIMARY KEY'

            if (field.auto) {
                str += ' AUTOINCREMENT'
            }
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

    sql = sql + '(' + fields.join(',') + ')'
    // console.log(sql)
    return sql
}
