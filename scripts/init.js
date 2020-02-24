const BASEURL = 'http://127.0.0.1:4200/';
// const BASEURL = 'https://pubgstats.info/';
const MAPPINGS = {
    'Asia': 'as',
    'Europe': 'eu',
    'North America': 'na',
    'Japan': 'jp',
    'Oceania': 'oc',
    'Russia': 'ru',
    'South and Central America': 'sa',
    'South East Asia': 'sea',
    'Korea': 'krjp',
    'Kakao': 'kakao'
};
let TELEMETRY_STATS = null;

// Disable automatic style injection for CSP 
Chart.platform.disableCSSInjection = true;

const isMobile = () => {
    return window.innerWidth < 540;
};
const showPreloader = () => {
    const l = document.querySelector('#preloader');
    const c = document.querySelector('#tele-container');
    c.classList.add('dont-show');
    l.classList.add('active');
};
const showTelemetryContainer = (show = true) => {
    const c = document.querySelector('#tele-container');
    if(show) {
        c.classList.contains('dont-show') && c.classList.remove('dont-show');
    }
    else {
        !c.classList.contains('dont-show') && c.classList.add('dont-show');
    }
};
const changeMenu = (li) => {
    const ul = document.querySelector('#mobile-nav');
    const lis = ul.querySelectorAll('li');
    if(lis && lis.length) {
        for(const l of lis) {
            if(l.classList.contains('active')) {
                l.classList.remove('active');
            }
        }
    }
    li.classList.add('active');
};
const getLeaderboard = (evt) => {
    let modeOrPlatform = evt.getAttribute('value');
    let alreadySelected = evt.classList.contains('selected');
    if(alreadySelected) {
        return ;
    }
    switch(modeOrPlatform) {
        case 'steam': case 'psn': case 'xbox': case 'kakao':
            let modes = document.querySelector('#leaderboard-mode-sel');
            modes = modes.querySelectorAll('li').values();
            let mode;
            for(const m of modes) {
                if(m.classList.contains('selected')) {
                    mode = m.getAttribute('value');
                }
            }
                
            window.location.href = BASEURL.concat(['leaderboard' + `/${modeOrPlatform}` + `/${mode}`]);
            break;
        default:
            let plts = document.querySelector('#leaderboard-platform-sel');
            plts = plts.querySelectorAll('li').values();
            let plat;
            for(const p of plts) {
                if(p.classList.contains('selected')) {
                    plat = p.getAttribute('value');
                }
            }
            let amodes = document.querySelector('#leaderboard-mode-sel');
            amodes = amodes.querySelectorAll('li').values();
            let themode;
            for(const m of amodes) {
                if(m.classList.contains('selected')) {
                    themode = m.getAttribute('value');
                }
            }
            if(!plat) {
                return ;
            }
            window.location.href = BASEURL.concat(['leaderboard' + `/${plat}` + `/${modeOrPlatform}`]);
            break;
    }
};
const searchPlayer = (event) => {
    event.preventDefault();
    const searchField = $('#search-field');
    const name = $(searchField).val();
    const URL = BASEURL.concat(['player/' + `${name}`]);
    //window.location.href = URL;
    window.location.href = URL;
    return false;
};
const selectPlatformPlayerStats = (li) => {
    const ul = document.querySelector('#player-info-platform-sel');
    const lis = ul.querySelectorAll('li');
    for(const l of lis) {
        if(l && l.classList && l.classList.contains('selected')) {
            l.classList.remove('selected');
        }
    }
    li && li.classList && li.classList.add('selected');
};
const getPlayerStats = () => {
    const formInput = document.querySelector('#player-info-name-input');
    let name = formInput.value; // problem; since ejs sets it to '', must submit and try 
    if(!name) {
        // submit form 
        const form = document.querySelector('#player-stats-name-form');
        form.onsubmit = () => { return false; }
        form.submit();
        const fi = form.querySelector('#player-info-name-input');
        return ;
    }   
    const ul = document.querySelector('#player-info-platform-sel');
    const lis = ul.querySelectorAll('li');
    let li;
    for(li of lis) {
        if(li.classList.contains('selected')) break;
    }
    const platform = li.getAttribute('value');
    window.location.href = BASEURL.concat(['player/' + `${platform}` + `/${name}`]);
};
const initCharts = () => {

    $.ajax({
        url: `${BASEURL}fetchTelemetryData`,
        dataType: 'json',
        method: 'GET',
        error: (e, txt, xhr) => console.error(e),
        success: (data, txt, xhr) => {
            const colors = {
                'Baltic_Main': "rgb(232, 211, 63)",
                'Desert_Main': "rgb(209, 123, 15)",
                'DihorOtok_Main': "rgb(183, 173, 207)",
                'Savage_Main': "rgb(64, 112, 118)",
                'Summerland_Main': "rgb(116,179,206)",
                'Other': 'rgb(101, 101, 102)'
            };
            let modeCode = [ 'solo', 'duo', 'squad', 'solo-fpp', 'duo-fpp', 'squad-fpp'];

            /**
             * top header bar information 
             */
            const headContainer = document.querySelector('#tele-container');
            $('#steam-player-count').text(data.activePlayerSteam);
            $('#players-count').text(data.playerCount)
            $('#total-matches').text(data.matchCount)
            $('#maps-count').text(data.mapCount)
            $('#total-days').text(data.dayCount)

            /**
             * TPP & FPP Chart
             */
            console.log(data.regionCount)
            new Chart(document.querySelector('#tpp-fpp'), {
                type: 'pie',
                data: {
                    datasets: [
                        { 
                            data: Object.values(MAPPINGS).map(l => {
                                let v = _.find(data.regionCount, {region_code:l});
                                return Number( (v ? v.c : 0) / data.matchCount * 100 ).toFixed(2)
                            }),
                            fill: true,
                            backgroundColor: [
                                '#5C80BC',
                                '#CE5374',
                                '#353B3C',
                                '#407076',
                                '#E8D33F',
                                '#D17B0F',
                                '#B7ADCF',
                                '#00B050',
                                '#C37DC4',
                                '#7030A0'
                            ] 
                        }
                    ],
                    labels: Object.values(MAPPINGS).map(l => {
                        if(l === 'krjp') return 'KOR';
                        else return l.toUpperCase();
                    })
                }   
            });

            /**
             * Chart 'Match Distribution by Game Modes' 
             */
            let modeTotal = modeCode.map(mode=>data.regionAndMode.reduce((sum, v)=>sum + (v.game_mode==mode ? v.c : 0), 0))

            new Chart(document.querySelector('#match-distribution'), {
                type: 'pie',
                data: {
                    datasets: [
                        {
                            data: modeTotal.map(e=>Number(e/data.matchCount*100).toFixed(2)),
                            fill: true,
                            backgroundColor: [
                                'rgb(232, 211, 63)',
                                'rgb(209, 123, 15)',
                                'rgb(183, 173, 207)',
                                'rgb(241, 81, 82)',
                                'rgb(53, 59, 60)',
                                'rgb(64, 112, 118)'
                            ]
                        }
                    ],
                    labels: ['Solo', 'Duo', 'Squad', 'Solo-FPP', 'Duo-FPP', 'Squad-FPP'],
                    // labels: modeCode.map(e=>e.toUpperCase())
                }
            });

            /** Chart 'Match Distribution by Region' */
            
            let modeByRegion = (()=>{
                let re = {}
                
                let sumByModes = Object.values(MAPPINGS).map(region=>data.regionAndMode.reduce((sum, v)=>sum+(v.region_code==region?v.c*1:0),0)) 
                modeCode.forEach((mode)=>{
                    re[mode] = Object.values(MAPPINGS).map((region,i)=>{
                        let v = _.find(data.regionAndMode, {region_code: region, game_mode: mode})
                        return sumByModes[i] && v ? Number(v.c/sumByModes[i]*100).toFixed(2) : 0
                    })
                });
                return re;
            })()
            
            if(!isMobile()) {
                document.querySelector('#mdist-region').height = 50;
            }

            new Chart(document.querySelector('#mdist-region'), {
                type: 'bar',
                data: {
                    labels: Object.values(MAPPINGS).map(l => {
                        if(l === 'krjp') return 'KOR';
                        else return l.toUpperCase();
                    }),
                    datasets: [{
                        label: 'Solo',
                        backgroundColor: "rgb(232, 211, 63)",
                        data: modeByRegion['solo']
                    }, {
                        label: 'Duo',
                        backgroundColor: "rgb(209, 123, 15)",
                        data: modeByRegion['duo']
                    }, 
                    {
                        label: 'Squad',
                        backgroundColor: "rgb(183, 173, 207)",
                        data: modeByRegion['squad']
                    }, 
                    {
                        label: 'Solo FPP',
                        backgroundColor: 'rgb(241, 81, 82)',
                        data: modeByRegion['solo-fpp']
                    }, {
                        label: 'Duo FPP',
                        backgroundColor: 'rgb(53, 59, 60)',
                        data: modeByRegion['duo-fpp']
                    }, 
                    {
                        label: 'Squad FPP',
                        backgroundColor: 'rgb(64, 112, 118)',
                        data: modeByRegion['squad-fpp']
                    }],
                },
                options: {
                    tooltips: {
                        displayColors: true,
                    },
                    scales: {
                    xAxes: [{
                        stacked: true,
                        gridLines: {
                        display: false,
                        }
                    }],
                    yAxes: [{
                        stacked: true,
                        ticks: {
                            min: 0,
                            max: 100.00
                        },
                        type: 'linear',
                    }]
                    },
                    responsive: true
                }
            });

            /**
             * Chart 'Match Distribution by Maps'
             */
            let modeByMap = (()=>{
                let re = {}
                
                let sumByModes = Object.keys(data.mapNames).map(map_name=>data.mapAndMode.reduce((sum, v)=>sum+(v.map_name==map_name?v.c*1:0),0)) 
                modeCode.forEach((mode)=>{
                    re[mode] = Object.keys(data.mapNames).map((map_name,i)=>{
                        let v = _.find(data.mapAndMode, {map_name: map_name, game_mode: mode})
                        return sumByModes[i] && v ? Number(v.c/sumByModes[i]*100).toFixed(2) : 0
                    })
                });
                return re;
            })()
            
            if(!isMobile()) {
                document.querySelector('#mdist-maps').height = 50;
            }
            new Chart(document.querySelector('#mdist-maps'), {
                type: 'bar',
                data: {
                    labels: Object.values(data.mapNames).map(n=>n.indexOf('Erangel')!==-1?'Erangel':n),
                    datasets: [
                        {
                            label: 'Solo',
                            backgroundColor: "rgb(232, 211, 63)",
                            data: modeByMap['solo']
                        },
                        {
                            label: 'Duo',
                            backgroundColor: 'rgb(209, 123, 15)',
                            data: modeByMap['duo']
                        },
                        {
                            label: 'Squad',
                            backgroundColor: 'rgb(183, 173, 207)',
                            data: modeByMap['squad'] 
                        },
                        {
                            label: 'Solo FPP',
                            backgroundColor: 'rgb(241, 81, 82)',
                            data: modeByMap['solo-fpp']
                        },
                        {
                            label: 'Duo FPP',
                            backgroundColor: 'rgb(53, 59, 60)',
                            data: modeByMap['duo-fpp']
                        },
                        {
                            label: 'Squad FPP',
                            backgroundColor: 'rgb(64, 112, 118)',
                            data: modeByMap['squad-fpp']
                        }
                    ],
                },
                options: {
                    tooltips: {
                        displayColors: true,
                    },
                    scales: {
                    xAxes: [{
                        stacked: true,
                        gridLines: {
                        display: false,
                        }
                    }],
                    yAxes: [{
                        stacked: true,
                        ticks: {
                            min: 0,
                            max: 100.00
                        },
                        type: 'linear',
                    }]
                    },
                    responsive: true
                }
            });

            /**
             * Chart 'Region Distribution by Maps'
             */
            let mapByRegion = (()=>{
                let re = {}
                
                let sumByRegions = Object.values(MAPPINGS).map(region=>data.regionAndMap.reduce((sum, v)=>sum+(v.region_code==region?v.c*1:0),0)) 
                Object.keys(data.mapNames).forEach((map)=>{
                    re[map] = Object.values(MAPPINGS).map((region,i)=>{
                        let v = _.find(data.regionAndMap, {region_code: region, map_name: map})
                        return sumByRegions[i] && v ? Number(v.c/sumByRegions[i]*100).toFixed(2) : 0
                    })
                });
                return re;
            })()

            if(!isMobile()) {
                document.querySelector('#reg-maps').height = 50;
            }

            new Chart(document.querySelector('#reg-maps'), {
                type: 'bar',
                data: {
                    labels: Object.values(MAPPINGS).map(l => {
                        if(l === 'krjp') return 'KOR';
                        else return l.toUpperCase();
                    }),
                    datasets: [
                        {
                            label: 'Miramar',
                            backgroundColor: colors['Desert_Main'],
                            data: mapByRegion['Desert_Main']
                        },
                        {
                            label: 'Vikendi',
                            backgroundColor: colors['DihorOtok_Main'],
                            data: mapByRegion['DihorOtok_Main']
                        },
                        {
                            label: 'Erangel',
                            backgroundColor: colors['Baltic_Main'],
                            data: mapByRegion['Baltic_Main']
                        },
                        {
                            label: 'Sanhok',
                            backgroundColor: colors['Savage_Main'],
                            data: mapByRegion['Savage_Main']
                        },
                        {
                            label: 'Karakin',
                            backgroundColor: colors['Summerland_Main'],
                            data: mapByRegion['Summerland_Main']
                        }
                    ]
                },
                options: {
                    tooltips: {
                        displayColors: true,
                    },
                    scales: {
                    xAxes: [{
                        stacked: true,
                        gridLines: {
                        display: false,
                        }
                    }],
                    yAxes: [{
                        stacked: true,
                        ticks: {
                            min: 0,
                            max: 100.00
                        },
                        type: 'linear',
                    }]
                    },
                    responsive: true,
                }
            });
            document.querySelector('#preloader').classList.remove('active');
            headContainer.classList.remove('dont-show');
        }
    })

}
