const axios = require('axios');
const { Sequelize } = require('sequelize');
const configs = require('./configs.json');
const mysqlfunc = require('./scripts/mysqlfunc.js');

const platforms = ['steam', 'kakao', 'tournament', 'xbox', 'psn', 'console'];

const REGULAR_MODES = [
  'duo',
  'duo-fpp',
  'solo',
  'solo-fpp',
  'squad',
  'squad-fpp',
];

const REGIONS = {
  as: 'Asia',
  eu: 'Europe',
  jp: 'Japan',
  kakao: 'Kakao',
  krjp: 'Korea',
  na: 'North America',
  oc: 'Oceania',
  ru: 'Russia',
  sa: 'South and Central America',
  sea: 'South East Asia',
  tournament: 'Tournaments',
};

const matcherPcRegion = /\.pc-.*\.(as|eu|jp|kakao|krjp|na|oc|ru|sa|sea|tournament)\./;
const dbAdapter = mysqlfunc.init(configs.DBHOST, configs.DBUSER, configs.DBPASS, configs.DBNAME);

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const axioPubgApi = axios.create({
  baseURL: 'https://api.pubg.com',
  headers: {
    accept: 'application/vnd.api+json',
    Authorization: 'Bearer ' + configs.APIkey
  }
});

async function matchesOfPlatform(platform){
  return await new Promise((resolve, reject)=>{
    axioPubgApi.get('/shards/'+platform+'/samples')
        .then(r=>{
          if(r.data && r.data.data)
            resolve(r.data.data.relationships.matches.data)
          else 
            reject([])
        })
  })
}

async function detailsOfMatch(matchID, platform){
  return await new Promise((resolve, reject)=>{
    axioPubgApi.get('/shards/'+platform+'/matches/' + matchID)
        .then(r=>{
          console.log(platform, matchID, r.data.included.length)
          if(r.data && r.data.data)
            resolve(r.data.data)
          else 
            reject({})
        })
  })
}

async function pulldown(){
  let matches, matchDetails;

  //platform level loop
  for(let _p in platforms){
    
    matches = await matchesOfPlatform(platforms[_p]);
    console.log(platforms[_p], 111, matches.length)

    if(!matches || !matches.length) break;

    //match level loop
    for(let _m in matches){
      matchDetails = await detailsOfMatch(matches[_m].id, platforms[_p])

      dbAdapter.insert('matches', {match_id:55555}).then(r=>console.log(r))
      
      // dbAdapter.insert()
      



    }


    // await sleep(500)
    break;
  }

}

// pulldown();