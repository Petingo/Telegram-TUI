export class Database{
    constructor() {
        this.init()
    }
    async init(){
        this.knex = require('knex')({
            client: 'sqlite3',
            connection:{
                filename: 'db/data.sqlite3'
            }
        })

        this.knex.schema.createTable('userInfoCache', (table) => {
            table.bigint("userId")
            table.string("userInfo")
        })

        this.knex.schema.createTable('chatInfoCache', (table) => {
            table.bigint("chatId")
            table.string("chatInfo")
        })
    }
}