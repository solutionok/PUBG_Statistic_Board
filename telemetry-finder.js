const axios = require('axios');
const { Sequelize } = require('sequelize');
const moment = require('moment');
const _ = require('lodash');
const fs = require('fs');
var nodemailer = require('nodemailer');
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

const platformRegions = [
  'pc-as',
  'pc-eu',
  'pc-jp',
  'pc-kakao',
  'pc-krjp',
  'pc-na',
  'pc-oc',
  'pc-ru',
  'pc-sa',
  'pc-sea',
  'pc-tournament',
  'psn-as',
  'psn-eu',
  'psn-na',
  'psn-oc',
  'xbox-as',
  'xbox-eu',
  'xbox-na',
  'xbox-oc',
  'xbox-sa',
];

const matcherPcRegionPC = /\.pc-.*\.(as|eu|jp|kakao|krjp|na|oc|ru|sa|sea|tournament)\./;
// const matcherPcRegionPC = /\.(custom|training|tdm|pc\-).*\.(as|eu|jp|kakao|krjp|na|oc|ru|sa|sea|tournament)\./;

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

async function matchesOfPlatform(platform) {
  try{

    return await new Promise((resolve, reject) => {
      axioPubgApi.get('/shards/' + platform + '/samples')
        .then(r => {
          if (r.data && r.data.data)
            resolve(r.data.data.relationships.matches.data)
          else
            reject([])
        })
    })
  }catch(e){
    return []
  }
}

async function detailsOfMatch(matchID, platform) {
  try{

    return await new Promise((resolve, reject) => {
      axioPubgApi.get('/shards/' + platform + '/matches/' + matchID)
        .then(r => {
  
          // console_debug(platform, matchID, r.data.included.length)
          if (r.data && r.data)
            resolve(r.data)
          else
            resolve(false)
        })
    })
  }catch(e){
    return false;
  }
}

function developerMailing(subject, text, attachFile){
  var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'plutoweb2020@gmail.com',
      pass: 'XubqHaki9,Dutf'
    }
  });

  var mailOptions = {
    from: 'plutoweb2020@gmail.com',
    to: 'coolpluto1114@gmail.com',
    subject: subject,
    text: text,
    // attachments : [
    //     {path: './package.json'} // stream this file
    // ]
  };

  if(attachFile){
    mailOptions['attachments'] = [
        {path: attachFile} // stream this file
    ]
  }


  transporter.sendMail(mailOptions, function(error, info){
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });

}

function console_debug(){
  const args = Array.from(arguments);
  let msg = args.reduce((o,i)=>{
    return o + ' ' + (typeof i == 'Object' ? JSON.stringify(i) : i)
  }, '')

  fs.appendFile('z.finder.log', msg + "\n", 'utf-8', (r)=>{
    console.log(msg)
  })

}

async function regionByAssetUrl(assetUrl) {
  try{

    return await new Promise((resolve, reject) => {
      axios.get(assetUrl)
        .then(r => {
          if (r.data && r.data.length) {
            let regionMatches = r.data[0] && r.data[0].MatchId ? r.data[0].MatchId.match(matcherPcRegionPC) : ''

            if (!regionMatches || !regionMatches.length) {
              console_debug('----Unknown region detected - ', r.data[0] && r.data[0].MatchId ? r.data[0].MatchId : r.data[0])
              resolve('')
            } else {
  
              if (Object.keys(REGIONS).indexOf(regionMatches[1]) !== -1) {
                // console_debug('region match possition 1', r.data[0].MatchId)
                resolve(regionMatches[1])
              } else if (regionMatches.length >= 2 && Object.keys(REGIONS).indexOf(regionMatches[2]) !== -1) {
  
                // console_debug('region match possition 2', r.data[0].MatchId)
                resolve(regionMatches[2])
              } else {
                console_debug('----Unknown region detected - ', r.data[0].MatchId)
                resolve('')
              }
            }
  
          }
          else
            reject({})
        })
    })
  }catch(e){
    return false;
  }
}

async function cacheMatch(matchDetails, logid){
  try{

    if(await dbAdapter.fetchOne('select * from a1_matches where uuid="'+matchDetails.data.id+'"')){
      return false;
    }
    let pcount = _.countBy(matchDetails.included, e => e.type === 'participant').true;
    console_debug('Trying cache for UUID: ', matchDetails.data.id)
    let row = {
      uuid: matchDetails.data.id,
      created_at: moment.utc(matchDetails.data.attributes.createdAt).format('YYYY-MM-DD HH:mm:ss'),
      duration: parseInt(matchDetails.data.attributes.duration),
      season_state: matchDetails.data.attributes.seasonState,
      is_custom_match: matchDetails.data.attributes.isCustomMatch * 1,
      match_type: matchDetails.data.attributes.matchType,
      stats: matchDetails.data.attributes.stats * 1,
      game_mode: matchDetails.data.attributes.gameMode,
      title_id: matchDetails.data.attributes.titleId,
      shard_id: matchDetails.data.attributes.shardId,
      map_name: matchDetails.data.attributes.mapName,
      player_count: pcount ? pcount : 0,
      region_code: '',
      logid: logid
    };
  
    let asset = _.find(matchDetails.included, { id: matchDetails.data.relationships.assets.data[0].id })
    if (asset) {
      let rcode = await regionByAssetUrl(asset.attributes.URL)
      if(!rcode) return false;
      row.region_code = rcode;
    }
  
    try{
      return dbAdapter.insert('a1_matches', row)
        .then(r => {
          return r;
        })
    }catch(e){
      return false;
    }
  }catch(e){
    return false;
  }
}

async function fetchTopPlayers(ids, platform){
  try{
    return await new Promise((resolve, reject) => {
      axioPubgApi.get('/shards/'+platform+'/players?filter[playerIds]=' + ids.join(','))
        .then(r => {
          if (r.data && r.data.data && r.data.data.length)
            resolve(r.data.data)
          else
            reject(false)
        })
    })
  }catch(e){
    return false
  }
}

function filterTopPlayerIds(participants, topPlayersIdCache){
  let ids =[], _player = null;

  for(let _tp in participants){
    _player = participants[_tp];

    if(_player.type!='participant'
       || !_player['attributes']
       || !_player['attributes']['stats'] 
       || !_player['attributes']['stats']['playerId'] 
       || _player['attributes']['stats']['winPlace'] > configs.TELEMETRY_TOP_PLAYER_LIMIT
       || topPlayersIdCache.indexOf(_player['attributes']['stats']['playerId']) !== -1
    ) {
      continue;
    }

    ids.push(_player['attributes']['stats']['playerId'] );
  }

  return ids;
}

async function cacheMatchesOfWinners(topPlayers, platform, logid, cachedUUID){
  let matchids = []
  for(let tp in topPlayers){
    if(!topPlayers[tp]['relationships']
      || !topPlayers[tp]['relationships']['matches']
      || !topPlayers[tp]['relationships']['matches']['data']
      || !topPlayers[tp]['relationships']['matches']['data'].length
    ){
      continue;
    }

    for(let pm in topPlayers[tp]['relationships']['matches']['data']){
      let matchid = topPlayers[tp]['relationships']['matches']['data'][pm].id
      if(cachedUUID.indexOf(matchid)!==-1) continue;
      
      
      //fetch a match      
      matchinfo = await detailsOfMatch(matchid, platform)
      if(!matchinfo) {
        console_debug('failed to fetch the match', matchid)
        continue;
      }
      //insert a match into database
      let insertID = await cacheMatch(matchinfo, logid);
      
      if(insertID){
        console_debug('UUID: ' + matchid + ' Created ', insertID, 'From player ', topPlayers[tp].id);
        matchids.push(matchid);
      }else{
        console_debug('UUID: ' + matchid + ' an issue while cache ', 'From player ', topPlayers[tp].id);
      }
    }

  }
  return matchids;
}

async function pulldown() {
  let matches, matchDetails, cachedUUID;
  let topPlayersIdCache = [];
  
  let oldlogname = 'z.finder'+moment.utc(new Date()).format('YYYY-MM-DD HH:mm:ss')+'.log';
  fs.rename('z.finder.log', oldlogname, (r)=>{
    console.log(r)
  })

  //mailing
  developerMailing('PUBG: new polling started'
                  , 'new polling started at UTC ' + moment.utc(new Date()).format('YYYY-MM-DD HH:mm:ss')
                  , oldlogname);

  cachedUUID = await dbAdapter.fetchCol('select uuid from a1_matches');

  let logid = await dbAdapter.insert('a1_matches_log', { starttime: moment.utc(new Date()).format('YYYY-MM-DD HH:mm:ss') });
  console_debug('---------------------- new session started at ' + moment.utc(new Date()).format('YYYY-MM-DD HH:mm:ss'))

  //platform level loop
  for (let _p in platforms) {

    matches = await matchesOfPlatform(platforms[_p]);
    if (!matches || !matches.length) continue;
    console_debug('platform-region : ' + platforms[_p] + ', total matches : ' + matches.length + ', endpoint url : ' + '/shards/' + platforms[_p] + '/samples')

    //match level loop
    for (let _m in matches) {
      if(cachedUUID.indexOf(matches[_m].id)!==-1) {
        console_debug('skip for uuid ', matches[_m].id)
        continue;
      }

      //fetch a match      
      matchDetails = await detailsOfMatch(matches[_m].id, platforms[_p])
      if(!matchDetails) {
        console_debug('failed to fetch the match', matches[_m].id)
        continue;
      }

      //insert a match into database
      let insertID = await cacheMatch(matchDetails, logid);

      if(insertID){
        console_debug('UUID: ' + matches[_m].id + ' Created ', insertID);
        cachedUUID.push(matches[_m].id);

        //filter top winner players only
        let _playerIds = filterTopPlayerIds(matchDetails.included, topPlayersIdCache)
        if(!_playerIds || !_playerIds.length)continue;
        topPlayersIdCache = topPlayersIdCache.concat(_playerIds)


        //cache matches from top players history
        let topPlayers = await fetchTopPlayers(_playerIds, platforms[_p]);
        if(!topPlayers || !topPlayers.length) continue;
        
        let matchids = await cacheMatchesOfWinners(topPlayers, platforms[_p], logid, cachedUUID);
        cachedUUID = cachedUUID.concat(matchids);
        
      }else{
        console_debug('UUID: ' + matches[_m].id + ' an issue while cache');
      }

    }

  }

}

async function pullcall() {
  await pulldown().then(r => {

    setTimeout(function () {

      pullcall();
    }, 5000)
  })
}

pullcall();