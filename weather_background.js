let API =  (navigator.userAgent.indexOf("Firefox") != -1) ? browser : chrome;
let n = 10;
let config;

// 옵션에서 새로운 주소지를 설정한 경우, 새 탭 페이지를 열었는데 현재 시간이 저장된 시간과 다른 경우 메시지 전송이 이뤄진다.
API.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.greeting === "fetchWeather") {
      API.storage.sync.get(null, async (items) => {
        const date = new Date();
        const offset = date.getTimezoneOffset() * 60000;
        const current_datetime = (new Date(date - offset)).toISOString();
        console.log("current update datetime:", current_datetime);
        if (!config) {
          const response = await fetch('weather_api_key.json');
          config = await response.json();
        }
        const weather_info = await update_weather(config.weather_api, n, items.weather_nx, items.weather_ny);
        API.storage.sync.set({ weather_info: weather_info, weather_info_datetime: current_datetime.slice(0, 13) }, () => {
          console.log("done");
          sendResponse({farewell: true});
        });
      });
    }
    return true;
  }
);

function setAlarmForNextHour() {
  const now = new Date();
  const timeToNextHour = (60 - now.getMinutes()) * 60 * 1000 - now.getSeconds() * 1000;
  chrome.alarms.create('weatherUpdate', {
    when: Date.now() + timeToNextHour,
    periodInMinutes: 60
  });
}

chrome.alarms.onAlarm.addListener(() => {
  API.storage.sync.get(null, async (items) => {
    const date = new Date();
    const offset = date.getTimezoneOffset() * 60000;
    const current_datetime = (new Date(date - offset)).toISOString();
    console.log("current update datetime:", current_datetime);
    if (!config) {
      const response = await fetch('weather_api_key.json');
      config = await response.json();
    }
    const weather_info = await update_weather(config.weather_api, n, items.weather_nx, items.weather_ny);
    API.storage.sync.set({ weather_info: weather_info, weather_info_datetime: current_datetime.slice(0, 13) }, () => {
      console.log("done");
    });
  });
});

chrome.runtime.onInstalled.addListener(setAlarmForNextHour);
chrome.runtime.onStartup.addListener(setAlarmForNextHour);

function get_number_str(encoded_str) {
  return /\d/.test(encoded_str) ? encoded_str : "-";
}

function get_time_num(nowDate) {
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
  if (sky <= 5) return "assets/sun.svg";
  if (sky <= 8) return "assets/sun_and_cloud.svg";
  return "assets/day_cloud.svg";
}

function night_icon_src(sky) {
  const lunar_day = get_lunar_day();
  if (sky <= 5) return (lunar_day >= 12 && lunar_day <= 18) ? "assets/full_moon.svg" : "assets/moon.svg";
  if (sky <= 8) return "assets/moon_and_cloud.svg";
  return "assets/night_cloud.svg";
}

function get_icon_str(nowDate, time, sky, pty) {
  const icon_src = {
      "1": "assets/rain.svg",
      "2": "assets/rain_and_snow.svg",
      "3": "assets/snow.svg",
      "4": "assets/rain.svg"
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

async function update_weather(weather_api, n, weather_nx, weather_ny) {
    const cur_date = new Date();
    const offset = cur_date.getTimezoneOffset() * 60000;
    const nowDate = new Date(cur_date - offset);
    const time_num = get_time_num(cur_date);

    let base_date = nowDate.toISOString().slice(0, 10).replace(/-/g, "");

    const quotient = (cur_date.getHours() * 60 + cur_date.getMinutes() - 130);
    if (quotient < 0) {
      cur_date.setDate(cur_date.getDate() - 1);
      const offset = cur_date.getTimezoneOffset() * 60000;
      const nowDate = new Date(cur_date - offset);
      base_date = nowDate.toISOString().slice(0, 10).replace(/-/g, "");
    }

    const base_time = new Date(time_num * 60 * 1000).toISOString().substr(11, 5).replace(":", "");
    if (!weather_nx || !weather_ny) return;
    const params = new URLSearchParams({
      serviceKey: weather_api,
      pageNo: '1',
      numOfRows: '1000',
      dataType: 'JSON',
      nx: weather_nx,
      ny: weather_ny,
      base_time: base_time,
      base_date: base_date
    });

    const url = `http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst?${params.toString()}`;

    let res_json = null;
    for (let i = 0; i < 5; i++) {
      try {
        const response = await fetch(url);
        res_json = await response.json();
        break;
      } catch (error) {
        if (i < 4) { // 마지막 시도에서는 대기하지 않음
          console.error(`Attempt ${i + 1} failed, retrying in 1 second...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    if (!res_json) { console.error('Failed to fetch weather info'); return; }
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

    return weather_info;
}
