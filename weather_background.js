let API =  (navigator.userAgent.indexOf("Firefox") != -1) ? browser : chrome;
let n = 10;

// Fetch weather data when the service worker starts
fetchWeatherData();

// Fetch weather data every hour
setInterval(fetchWeatherData, 1000 * 60 * 60);

function get_number_str(encoded_str) {
  return /\d/.test(encoded_str) ? encoded_str : "-";
}

function get_time_num() {
  const nowDate = new Date();
  const quotient = (nowDate.getHours() * 60 + nowDate.getMinutes() - 130);
  let time_num = Math.floor((nowDate.getHours() * 60 + nowDate.getMinutes() - 130) / 180) * 180 + 130;
  if (quotient < 0) {
      time_num = 1390;
  }
  return time_num;
}

function sun_rises_at_6(nowDate) {
  const start = new Date(nowDate.getFullYear(), 3, 13);
  const end = new Date(nowDate.getFullYear(), 7, 30);
  return (nowDate > start && nowDate < end);
}

function sun_rises_at_18(nowDate) {
  const start = new Date(nowDate.getFullYear(), 1, 6);
  const end = new Date(nowDate.getFullYear(), 9, 12);
  return (nowDate > start && nowDate < end);
}

function get_lunar_day() {
  const date1 = new Date();
  const date2 = new Date('2021-09-06');
  const interval = Math.floor((date1 - date2) / (1000 * 3600 * 24)) % 59;
  return interval > 29 ? interval - 29 : interval;
}

function day_icon_src(sky) {
  if (sky <= 5) return "assets/sun.png";
  if (sky <= 8) return "assets/sun_and_cloud.png";
  return "assets/day_cloud.png";
}

function night_icon_src(sky) {
  const lunar_day = get_lunar_day();
  if (sky <= 5) return (lunar_day >= 12 && lunar_day <= 18) ? "assets/full_moon.png" : "assets/moon.png";
  if (sky <= 8) return "assets/moon_and_cloud.png";
  return "assets/night_cloud.png";
}

function get_icon_str(nowDate, time, sky, pty) {
  const icon_src = {
      "1": "assets/rain.png",
      "2": "assets/rain_and_snow.png",
      "3": "assets/snow.png",
      "4": "assets/rain.png"
  };
  if (pty === "0") {
      if (time <= 3 || time >= 21) return night_icon_src(sky);
      if (time >= 9 && time <= 15) return day_icon_src(sky);
      if (time === 6) return (sun_rises_at_6(nowDate)) ? day_icon_src(sky) : night_icon_src(sky);
      return (sun_rises_at_18(nowDate)) ? day_icon_src(sky) : night_icon_src(sky);
  } else {
      return icon_src[pty];
  }
}

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

      console.log("successfully updated weather info!");
    }

    API.storage.sync.set({weather_info: weather_info});
}

function fetchWeatherData() {
    API.storage.sync.get(null, async (items) => {
        if (items.weather_api) {
            update_weather(items.weather_api, n);
        }
    });
}
