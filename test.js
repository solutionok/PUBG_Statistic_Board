const moment = require('moment');
const fs = require('fs');
const configs = require('./configs.json');
const mysqlfunc = require('./scripts/mysqlfunc.js');


const dbAdapter = mysqlfunc.init(configs.DBHOST, configs.DBUSER, configs.DBPASS, configs.DBNAME);

async function test(){
    console.log(__dirname)
}
test()