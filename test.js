const moment = require('moment');
const configs = require('./configs.json');
const mysqlfunc = require('./scripts/mysqlfunc.js');


const dbAdapter = mysqlfunc.init(configs.DBHOST, configs.DBUSER, configs.DBPASS, configs.DBNAME);

async function test(){

    const totalMatches = await dbAdapter.fetchOne('SELECT count(id) FROM a1_matches')
    console.log(totalMatches)
}
test()