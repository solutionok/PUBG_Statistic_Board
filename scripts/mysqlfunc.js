const mysql = require('mysql');
module.exports = {
    con: null,
    
    init: function(host, user, password, db){
        this.con =  mysql.createConnection({
            host: host,
            user: user,
            password: password,
            database: db
        });
        this.con.connect();
        return this;
    },

    query: function(query){
        if(!this.con){
            console.error('Database connection did not initiated yet!');
            return null;
        }
        return new Promise((resolve, reject)=>{

            this.con.query(query, (e, re) => {
                
                if(e) {
                    console.error(e);
                    reject(false)
                } else {
                    resolve(re)
                }
            })
        })
    },


    insert: async function(table, row){
        let sql = 'INSERT INTO ' + table + ' SET ';
        let fields = [];
        
        for(let f in row){
            fields.push('`' + f + '`="' + row[f] + '"')
        }
        
        sql += fields.join(', ');
        
        await this.query(sql);

        return this.fetchOne('select LAST_INSERT_ID()');
    },

    fetchOne: async function(sql){
        if(sql.toLocaleLowerCase().indexOf('limit')===-1){

            sql += ' LIMIT 1';
        }

        let qr = await this.query(sql);
        if(!qr){

            return false;
        }else{

            let fv;
            for(let f1 in qr){

                for(let f2 in qr[f1]){

                    fv = qr[f1][f2];
                    break;
                }
                break;
            }    
            return fv;
        }

    }
}