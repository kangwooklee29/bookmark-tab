let API = (navigator.userAgent.indexOf("Firefox") != -1) ? browser : chrome;
let n = 10;
let config;
let calendarAccessToken = null;
const calendarClientId = '427328739540-3jorcqa54ie31ilrliejf9ko15ctjdj1.apps.googleusercontent.com';

// 옵션에서 새로운 주소지를 설정한 경우, 새 탭 페이지를 열었는데 현재 시간이 저장된 시간과 다른 경우 메시지 전송이 이뤄진다.
API.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    const now = new Date();
    if (request.greeting === "fetchWeather") {
      update_weather(now, new Date(request.weather_info_datetime), request.weather_loc, request.weather_info).then(weather_info => {
        API.storage.sync.set({ weather_info: weather_info, weather_info_datetime: now.getTime(), weather_loc: request.weather_loc }, () => {
          sendResponse({farewell: true, weather_info: weather_info});
        });  
      });
    } else if (request.greeting === "fetchCalendarEvents") {
      fetchCalendarEvents(now, new Date(request.calendarUpdateTime), request.calendarEvents).then(calendarEvents => {
        API.storage.sync.set({ calendarEvents: calendarEvents, calendarUpdateTime: now.getTime() }, () => {
          sendResponse({farewell: true, calendarEvents: calendarEvents});
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
    let now = new Date();
    const weather_info = await update_weather(now, new Date(items.weather_info_datetime), items.weather_loc, items.weather_info);
    API.storage.sync.set({ weather_info: weather_info, weather_info_datetime: now.getTime() }, () => {
      console.log("done");
    });
    const calendarEvents  = await fetchCalendarEvents(now, new Date(items.calendarUpdateTime), items.calendarEvents);
    API.storage.sync.set({ calendarEvents: calendarEvents, calendarUpdateTime: now.getTime() }, () => {
      console.log("done");
    });
  });
});

chrome.runtime.onInstalled.addListener(setAlarmForNextHour);
chrome.runtime.onStartup.addListener(setAlarmForNextHour);

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

function get_icon_str(is_day, pty) {
  const icon_src = {
      rain: "../src/assets/img/rain.svg",
      rain_and_snow: "../src/assets/img/rain_and_snow.svg",
      snow: "../src/assets/img/snow.svg"
  };
  if (pty < 500 || pty > 629) {
    return is_day ? day_icon_src(pty) : night_icon_src(pty);
  } else if (pty < 600)
    return icon_src.rain;
  else if (pty >= 610 && pty < 620)
    return icon_src.rain_and_snow;
  return icon_src.snow;
}

async function update_weather(cur_date, stored_date, weather_loc, prev_weather_info) {
  const weather_info = [], records = [];

  if (cur_date.getHours() === stored_date.getHours()) return prev_weather_info;

  if (!config) {
    const response = await fetch('../../weather_api_key.json');
    config = await response.json();
  }

  const params = new URLSearchParams({
    appid: config.weather_api,
    lat: weather_loc.latitude,
    lon: weather_loc.longitude
  });

  let url = `https://api.openweathermap.org/data/2.5/weather?${params.toString()}`;
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

  let sunrise, sunset;
  if (res_json.cod === 200) {
    sunrise = new Date(res_json.sys.sunrise * 1000).getHours();
    sunset = new Date(res_json.sys.sunset * 1000).getHours();
    res_json.dt = cur_date.getTime() / 1000;
    records.push(res_json);
  }

  // 5개를 display하는 상황이라고 가정할 때.
  // cur_date가 18시이면 21, 0, 3, 6, 9, 12, ...를 가져온다. 현재 17, 18, 21, 0, 3, 6 이렇게 6개 있는데 다 날아가고.
  //                                                  업데이트 후, 18, 21, 0, 3, 6, 9가 저장된다.
  // cur_date가 19시이면 안 가져온다. 19, 21, 0, 3, 6, 9가 저장된다.
  // cur_date가 20시이면 안 가져온다. 20, 21, 0, 3, 6, 9가 저장된다.
  if (cur_date.getHours() % 3 == 0 || !prev_weather_info || cur_date - stored_date >= 3600000) {
    url = `https://api.openweathermap.org/data/2.5/forecast?${params.toString()}`;
    res_json = null;
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
    if (new Date(res_json.list[0].dt * 1000).getHours() === cur_date.getHours())
      records.push(...res_json.list.slice(1));
    else
      records.push(...res_json.list);
  }

  const pty = [], tmp = [], pcp = [], pop = [], time = [];
  let cnt = 0;
  for (const item of records) {
    time.push(new Date(item.dt * 1000).getHours());

    if (item.pop !== undefined)
      pop.push(Math.floor(item.pop * 100));
    else
      pop.push(0);

    const celsius = item.main.temp - 273.15;
    tmp.push(celsius >= 0 ? Math.round(celsius) : Math.round(celsius * 10) / 10);

    let cur_pcp = 0;
    if (item.rain && ("1h" in item.rain || "3h" in item.rain)) {
      cur_pcp = Math.floor("1h" in item.rain ? item.rain["1h"] : item.rain["3h"] / 3);
      if ("3h" in item.rain && cur_pcp === 0)
        cur_pcp = 1;
    } else if (item.snow && ("1h" in item.snow || "3h" in item.snow)) {
      cur_pcp = Math.floor("1h" in item.snow ? item.snow["1h"] : item.snow["3h"] / 3);
      if ("3h" in item.snow && cur_pcp === 0)
        cur_pcp = 1;
    }
    pcp.push(cur_pcp);
    pty.push(item.weather[0].id); // 현재 눈/비 오는지. 비오면 5xx, 눈오면 60x or 62x, 눈비는 61x. 

    cnt++;
    if (cnt > n) break;
  }

  for (let i = 0; i < cnt; i++)
    weather_info.push({
      icon: get_icon_str((time[i] > sunrise && time[i] < sunset), pty[i]),
      time: time[i],
      tmp: tmp[i],
      pcp: pcp[i],
      pop: pop[i]
    });

  // cur_date.getHours()가 3의 배수가 아니면 최신 날씨만 가져옴.
  if (cnt === 1)
    weather_info.push(...prev_weather_info.slice(1));

  return weather_info;
}

function formatDate(date) {
  let year = date.getFullYear();
  let month = (date.getMonth() + 1).toString().padStart(2, '0');
  let day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function fetchCalendarEvents(cur_date, stored_date, stored_events) {
  if (cur_date.getHours() === stored_date.getHours() && cur_date - stored_date <= 3600000) return stored_events;
  else console.log(cur_date.getHours(), stored_date.getHours(), cur_date - stored_date);

  if (!calendarAccessToken) {
    const items = await API.storage.sync.get(["calendarAccessToken"]);
    if (!items.calendarAccessToken) {
      const redirectUrl = await new Promise((resolve, reject) => {
        chrome.identity.launchWebAuthFlow({
          url: `https://accounts.google.com/o/oauth2/auth?client_id=${calendarClientId}&response_type=token&scope=${encodeURIComponent('https://www.googleapis.com/auth/calendar')}&redirect_uri=${encodeURIComponent(chrome.identity.getRedirectURL())}`,
          interactive: true
        }, (result) => {
          if (chrome.runtime.lastError || !result)
            reject(chrome.runtime.lastError);
          else
            resolve(result);
        });
      });
      const url = new URL(redirectUrl);
      calendarAccessToken = url.hash.match(/access_token=([^&]+)/)[1];
      API.storage.sync.set({calendarAccessToken: calendarAccessToken});  
    } else
      calendarAccessToken = items.calendarAccessToken;
  }

  const nextWeek = new Date(cur_date.getTime() + 14 * 24 * 60 * 60 * 1000);
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${formatDate(cur_date)}T00:00:00Z&timeMax=${formatDate(nextWeek)}T00:00:00Z`;
  for (let i = 0; i < 5; i++) {
    try {
      const response = await fetch(url, { headers: { 'Authorization': `Bearer ${calendarAccessToken}` } });
      const data = await response.json();
      return data.items;
    } catch (error) {
      if (i < 4) { // 마지막 시도에서는 대기하지 않음
        console.error(`Attempt ${i + 1} failed, retrying in 1 second...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  console.error('Failed to fetch calendar info', response);
  return [];
}
