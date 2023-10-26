let n = 10;

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
    if (sky <= 5) return "sun.png";
    if (sky <= 8) return "sun_and_cloud.png";
    return "day_cloud.png";
}

function night_icon_src(sky) {
    const lunar_day = get_lunar_day();
    if (sky <= 5) return (lunar_day >= 12 && lunar_day <= 18) ? "full_moon.png" : "moon.png";
    if (sky <= 8) return "moon_and_cloud.png";
    return "night_cloud.png";
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
        "1": "rain.png",
        "2": "rain_and_snow.png",
        "3": "snow.png",
        "4": "rain.png"
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

async function update_weather(n) {
    const nowDate = new Date();
    const time_num = await get_time_num();
    let base_date = nowDate.toISOString().slice(0, 10).replace(/-/g, "");

    const quotient = (nowDate.getHours() * 60 + nowDate.getMinutes() - 130);
    if (quotient < 0) {
      nowDate.setDate(nowDate.getDate() - 1);
      base_date = nowDate.toISOString().slice(0, 10).replace(/-/g, "");
    }

    const base_time = new Date(time_num * 60 * 1000).toISOString().substr(11, 5).replace(":", "");

    const params = new URLSearchParams({
      serviceKey: localStorage.getItem("weather_api"),
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

    return weather_info;
}

async function run_weather() {
    const savedWeatherInfo = JSON.parse(localStorage.getItem("weather_info")) || [];
    const savedUpdateDate = localStorage.getItem("update_date") || "";
    const savedTimeNum = localStorage.getItem("time_num") || "";
    
    const nowDate = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    let weatherInfo = [];
    
    if (!savedUpdateDate || savedTimeNum !== get_time_num() || savedUpdateDate !== nowDate) {
      weatherInfo = await update_weather();
      localStorage.setItem("update_date", nowDate);
      localStorage.setItem("time_num", get_time_num());
      localStorage.setItem("weather_info", JSON.stringify(weatherInfo));
    } else {
      weatherInfo = savedWeatherInfo;
    }
    

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

run_weather();
