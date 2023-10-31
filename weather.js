let API =  (navigator.userAgent.indexOf("Firefox") != -1) ? browser : chrome;

function get_time_num() {
    const nowDate = new Date();
    const quotient = (nowDate.getHours() * 60 + nowDate.getMinutes() - 130);
    let time_num = Math.floor((nowDate.getHours() * 60 + nowDate.getMinutes() - 130) / 180) * 180 + 130;
    if (quotient < 0) {
        time_num = 1390;
    }
    return time_num;
}

function get_lunar_day() {
    const date1 = new Date();
    const date2 = new Date('2021-09-06');
    const interval = Math.floor((date1 - date2) / (1000 * 3600 * 24)) % 59;
    return interval > 29 ? interval - 29 : interval;
}

function get_number_str(encoded_str) {
    return /\d/.test(encoded_str) ? encoded_str : "-";
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

async function run_weather(weatherInfo) {
    const table = document.getElementById('weatherTable');

    // Time row with 'sepa' class
    const timeRow = document.createElement('tr');
    timeRow.className = 'time';
    const timeCell = document.createElement('td');
    timeCell.colSpan = weatherInfo.length;

    const timeDiv = document.createElement('div');
    weatherInfo.forEach((info, index) => {
      const timeDivChild = document.createElement('div');
      timeDivChild.innerHTML = info.time;
      timeDiv.appendChild(timeDivChild);

      if (index !== weatherInfo.length - 1) {
        const sepaDiv = document.createElement('div');
        sepaDiv.className = 'sepa';
        sepaDiv.innerHTML = '&nbsp;';
        timeDiv.appendChild(sepaDiv);
      }
    });
    timeCell.appendChild(timeDiv);
    timeRow.appendChild(timeCell);
    table.appendChild(timeRow);

    // Create and append other rows (icon, pop, pcp, tmp)
    ['icon', 'pop', 'pcp', 'tmp'].forEach(key => {
      const row = document.createElement('tr');
      weatherInfo.forEach(info => {
        const cell = document.createElement('td');
        if (key === 'icon') {
          cell.innerHTML = `<img src="${info[key]}">`;
        } else {
          cell.innerHTML = info[key];
        }
        row.appendChild(cell);
      });
      table.appendChild(row);
    });

}

API.storage.sync.get(['weather_info'], async (items) => {
  if (items.weather_info) {
    run_weather(JSON.parse(items.weather_info));
  }
});
