const axios = require('axios');
const { Sequelize } = require('sequelize');
const moment = require('moment');
const _ = require('lodash');

const configs = require('./configs.json');
const mysqlfunc = require('./scripts/mysqlfunc.js');

//for now, will apply for steam(pc players)
const platforms = ['steam', 'kakao', 'tournament', 'xbox', 'psn', 'console'/****/];

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

const matcherPcRegionPC = /\.pc-.*\.(as|eu|jp|kakao|krjp|na|oc|ru|sa|sea|tournament)\./;
// const matcherPcRegionTraning = /\.training.*\.(as|eu|jp|kakao|krjp|na|oc|ru|sa|sea|tournament)\./;
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
          
          // console.log(platform, matchID, r.data.included.length)
          if(r.data && r.data)
            resolve(r.data)
          else 
            reject({})
        })
  })
}

async function regionByAssetUrl(assetUrl){

  return await new Promise((resolve, reject)=>{
    axios.get(assetUrl)
        .then(r=>{
          if(r.data && r.data){
            console.log(r.data[0].MatchId)
            const regionMatches = r.data[0].MatchId.match(matcherPcRegionPC)

            resolve(regionMatches && regionMatches[1] ? regionMatches[1] : '')
          }
          else 
            reject({})
        })
  })
}

async function pulldown(){
  let matches, matchDetails;
  
  let logid = await dbAdapter.insert('a1_matches_log', {starttime: moment.utc(new Date()).format('YYYY-MM-DD HH:mm:ss')});
  console.log('---------------------- new session started at ' + moment.utc(new Date()).format('YYYY-MM-DD HH:mm:ss'))

  //platform level loop
  for(let _p in platforms){
    
    matches = await matchesOfPlatform(platforms[_p]);
    console.log( 'platform : ' + platforms[_p] + ', total matches : ' + matches.length + ', endpoint url : ' + '/shards/'+platforms[_p]+'/samples')
    continue;

    if(!matches || !matches.length) break;
    //match level loop
    for(let _m in matches){
      matchDetails = await detailsOfMatch(matches[_m].id, platforms[_p])

      dbAdapter.fetchOne('select * from a1_matches where uuid="'+matchDetails.data.id+'"').then(async (has)=>{
        let row = {
          uuid:           matchDetails.data.id,
          created_at:     moment.utc(matchDetails.data.attributes.createdAt).format('YYYY-MM-DD HH:mm:ss'),
          duration:       parseInt(matchDetails.data.attributes.duration),
          season_state:   matchDetails.data.attributes.seasonState,
          is_custom_match: matchDetails.data.attributes.isCustomMatch*1,
          match_type:     matchDetails.data.attributes.matchType,
          stats:          matchDetails.data.attributes.stats*1,
          game_mode:      matchDetails.data.attributes.gameMode,
          title_id:       matchDetails.data.attributes.titleId,
          shard_id:       matchDetails.data.attributes.shardId,
          map_name:       matchDetails.data.attributes.mapName,
          player_count:   _.countBy(matchDetails.included, e=>e.type==='participant').true,
          region_code:    '',
          logid:          logid       
        };

        //@todo this action should be execute when data insert, so this action is temp
        let asset = _.find(matchDetails.included, {id:matchDetails.data.relationships.assets.data[0].id})
        if(asset){
          row.region_code = await regionByAssetUrl(asset.attributes.URL)
        }

        if(has){
          dbAdapter.update('a1_matches', row, 'uuid="'+row.uuid+'"')
                  .then(r=>console.log('UUID: ' + row.uuid + ' Updated, Affected Rows: ' + r));
        }else{
          dbAdapter.insert('a1_matches', row)
                  .then(r=>console.log('UUID: ' + row.uuid + ' Created, ID: ' + r))
        }
      })
    }

  }

  setTimeout(function(){

    pulldown();
  }, 5000)
}
pulldown();