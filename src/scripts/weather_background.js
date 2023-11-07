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
        const current_datetime = (new Date(date - offset)).toISOString(), cur_hour_div_3 = Math.floor(date.getHours() / 3);
        console.log("current update datetime:", current_datetime);
        if (!config) {
          const response = await fetch('../../weather_api_key.json');
          config = await response.json();
        }
        const weather_info = await update_weather(config.weather_api, n, request.weather_loc);
        API.storage.sync.set({ weather_info: weather_info, weather_info_datetime: `${current_datetime.slice(0, 10)}${cur_hour_div_3}`, weather_loc: request.weather_loc }, () => {
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
    const current_datetime = (new Date(date - offset)).toISOString(), cur_hour_div_3 = Math.floor(date.getHours() / 3);
    console.log("current update datetime:", current_datetime);
    if (!config) {
      const response = await fetch('../../weather_api_key.json');
      config = await response.json();
    }
    const weather_info = await update_weather(config.weather_api, n, items.weather_loc);
    API.storage.sync.set({ weather_info: weather_info, weather_info_datetime: `${current_datetime.slice(0, 10)}${cur_hour_div_3}` }, () => {
      console.log("done");
    });
  });
});

chrome.runtime.onInstalled.addListener(setAlarmForNextHour);
chrome.runtime.onStartup.addListener(setAlarmForNextHour);

function get_number_str(encoded_str) {
  return /\d/.test(encoded_str) ? encoded_str : "-";
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
  if (sky == 800) return "../src/assets/img/sun.svg";
  if (sky <= 802) return "../src/assets/img/sun_and_cloud.svg";
  return "../src/assets/img/day_cloud.svg";
}

function night_icon_src(sky) {
  const lunar_day = get_lunar_day();
  if (sky == 800) return (lunar_day >= 12 && lunar_day <= 18) ? "../src/assets/img/full_moon.svg" : "../src/assets/img/moon.svg";
  if (sky <= 802) return "../src/assets/img/moon_and_cloud.svg";
  return "../src/assets/img/night_cloud.svg";
}

function get_icon_str(nowDate, time, pty) {
  const icon_src = {
      rain: "../src/assets/img/rain.svg",
      rain_and_snow: "../src/assets/img/rain_and_snow.svg",
      snow: "../src/assets/img/snow.svg"
  };
  if (pty < 500 || pty > 629) {
      if (time <= 3 || time >= 21) return night_icon_src(pty);
      if (time >= 9 && time <= 15) return day_icon_src(pty);
      if (time === 6) return (sun_rises_at_6(nowDate)) ? day_icon_src(pty) : night_icon_src(pty);
      return (sun_rises_at_18(nowDate)) ? day_icon_src(pty) : night_icon_src(pty);
  } else if (pty < 600)
    return icon_src.rain;
  else if (pty >= 610 && pty < 620)
    return icon_src.rain_and_snow;
  return icon_src.snow;
}

async function update_weather(weather_api, n, weather_loc) {
    const params = new URLSearchParams({
      appid: weather_api,
      lat: weather_loc.latitude,
      lon: weather_loc.longitude
    });

    const url = `https://api.openweathermap.org/data/2.5/forecast?${params.toString()}`;
    console.log(url);

    let res_json = null;
    for (let i = 0; i < 5; i++) {
      try {
        const response = await fetch(url);
        res_json = await response.json();
        break;
      } catch (error) {
        console.log(error);
        if (i < 4) { // 마지막 시도에서는 대기하지 않음
          console.error(`Attempt ${i + 1} failed, retrying in 1 second...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    if (!res_json) { console.error('Failed to fetch weather info'); return; }
    const weather_info = [];

    if (res_json.cod === "200") {
      const pty = [], tmp = [], pcp = [], sno = [], pop = [], time = [];
      
      let cnt = 0;
      for (const item of res_json.list) {
        time.push(new Date(item.dt * 1000).getHours());

        pop.push(parseInt(item.pop) * 100);

        const celsius = item.main.temp - 273.15;
        tmp.push(celsius >= 0 ? Math.round(celsius) : Math.round(celsius * 10) / 10);

        if (item.rain)
          pcp.push(parseInt(item.rain["3h"] / 3))
        else if (item.snow)
          pcp.push(parseInt(item.snow["3h"] / 3))

        pty.push(item.weather[0].id); // 현재 눈/비 오는지. 비오면 5xx, 눈오면 60x or 62x, 눈비는 61x. 

        cnt++;
        if (cnt > n) break;
      }
  
      for (let i = 0; i < n; i++) {
        let temp = get_number_str(pcp[i]);
        if (temp !== "") {
          pcp[i] = temp;
        } else {
          pcp[i] = get_number_str(sno[i]);
        }
        weather_info.push({
          icon: `<img src="${get_icon_str(new Date(), time[i], pty[i])}">`,
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
