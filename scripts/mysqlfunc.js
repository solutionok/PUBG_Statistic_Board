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

        return await this.fetchOne('select LAST_INSERT_ID()');
    },

    update: async function(table, row, where){
        let sql = 'UPDATE ' + table + ' SET ';
        let fields = [];
        
        for(let f in row){
            fields.push('`' + f + '`="' + row[f] + '"')
        }
        
        sql += fields.join(', ');
        
        if(where){
            sql += ' WHERE ' + where;
        }
        await this.query(sql);

        return await this.fetchOne('SELECT ROW_COUNT()');
    },
    
    fetchOneRow: async function(sql){
        if(sql.toLocaleLowerCase().indexOf('limit')===-1){

            sql += ' LIMIT 1';
        }

        let qr = await this.query(sql);
        return qr && qr.length ? qr[0] : false;

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

    },
    fetchCol: async function(sql){
        let qr = await this.query(sql);
        if(!qr){

            return false;
        }else{

            let fv= [];
            for(let f1 in qr){

                for(let f2 in qr[f1]){

                    fv.push(qr[f1][f2]);
                    break;
                }
            }    
            return fv;
        }

    },
    fetchAll: async function(sql){
        let qr = await this.query(sql);
        if(!qr){

            return false;
        }else{
            return qr;
        }

    }
}