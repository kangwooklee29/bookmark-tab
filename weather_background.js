let API =  (navigator.userAgent.indexOf("Firefox") != -1) ? browser : chrome;
let n = 10;

// Fetch weather data when the service worker starts
fetchWeatherData();

// Fetch weather data every hour
setInterval(fetchWeatherData, 1000 * 60 * 60);

async function update_weather(weather_api, n) {
    const nowDate = new Date();
    const time_num = get_time_num();
    let base_date = nowDate.toISOString().slice(0, 10).replace(/-/g, "");

    const quotient = (nowDate.getHours() * 60 + nowDate.getMinutes() - 130);
    if (quotient < 0) {
      nowDate.setDate(nowDate.getDate() - 1);
      base_date = nowDate.toISOString().slice(0, 10).replace(/-/g, "");
    }

    const base_time = new Date(time_num * 60 * 1000).toISOString().substr(11, 5).replace(":", "");

    const params = new URLSearchParams({
      serviceKey: weather_api,
      pageNo: '1',
      numOfRows: '1000',
      dataType: 'JSON',
      nx: '61',
      ny: '126',
      base_time: base_time,
      base_date: base_date
    });

    const url = `http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst?${params.toString()}`;

    const response = await fetch(url);
    const res_json = await response.json();
    const weather_info = [];

    if (res_json.response.header.resultCode === "00") {
      let cnt = 0;
      const sky = [], pty = [], tmp = [], pcp = [], sno = [], pop = [], time = [];
      
      for (const item of res_json.response.body.items.item) {
        const icat = item.category;
        const ival = item.fcstValue;
        const itime = parseInt(item.fcstTime.slice(0, 2), 10);
        if (itime % 3 !== 0) continue;
        
        if (icat === "PTY") {
          if (cnt === n) break;
          time.push(itime);
          pty.push(ival);
          cnt++;
        }
        if (icat === "SKY" && sky.length < n) sky.push(ival);
        if (icat === "TMP" && tmp.length < n) tmp.push(ival);
        if (icat === "PCP" && pcp.length < n) pcp.push(ival);
        if (icat === "SNO" && sno.length < n) sno.push(ival);
        if (icat === "POP" && pop.length < n) pop.push(ival);
      }
  
      for (let i = 0; i < n; i++) {
        let temp = get_number_str(pcp[i]);
        if (temp !== "") {
          pcp[i] = temp;
        } else {
          pcp[i] = get_number_str(sno[i]);
        }
        weather_info.push({
          icon: `<img src="${get_icon_str(nowDate, time[i], sky[i], pty[i])}">`,
          time: time[i],
          tmp: tmp[i],
          pcp: pcp[i],
          pop: pop[i]
        });
      }
    }

    API.storage.sync.set({weather_info: weather_info});
}

function fetchWeatherData() {
    API.storage.sync.get(['weather_api'], async (items) => {
        if (items.weather_api) {
            update_weather(items.weather_api, n);
        }
    });
}
