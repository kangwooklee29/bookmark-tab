let API =  (navigator.userAgent.indexOf("Firefox") != -1) ? browser : chrome;

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
        cell.innerHTML = info[key];
        if (key === 'pcp') {
          if (info['icon'].includes("snow"))
            cell.innerHTML = `${info[key] / 10}㎝`;
          else 
            cell.innerHTML += "㎜";
        }
        if (key === "tmp") cell.innerHTML += "℃";
        if (key === "pop") cell.innerHTML += "%";
        row.appendChild(cell);
      });
      table.appendChild(row);
    });

}


async function fetch_weather_loc() {
  const position = await new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject);
  });
  
  return position.coords;
}


const date = new Date();
const offset = date.getTimezoneOffset() * 60000;
const cur_date_str = (new Date(date - offset)).toISOString().slice(0, 13);

function fetch_and_run(weather_loc) {
  API.runtime.sendMessage( {greeting: "fetchWeather", weather_loc: {latitude: weather_loc.latitude, longitude: weather_loc.longitude}}, function(response) {
    console.log("Response:", response);
    API.storage.sync.get(['weather_info'], async (items) => {
      run_weather(items.weather_info);
    });
  });
}

API.storage.sync.get(['weather_info_datetime', 'weather_info', 'weather_loc'], async (items) => {
  console.log(items);
  let weather_loc = items.weather_loc;
  if (!items.weather_loc) {
    weather_loc = await fetch_weather_loc();
    fetch_and_run(weather_loc);
  } else {
    fetch_and_run(weather_loc);
    navigator.geolocation.getCurrentPosition(pos => {
      const new_loc = { latitude: Math.round(pos.coords.latitude * 10) / 10, longitude: Math.round(pos.coords.longitude * 10) / 10}
      if (new_loc.latitude != weather_loc.latitude || new_loc.longitude != weather_loc.longitude) {
        document.getElementById('weatherTable').innerHTML = "";
        fetch_and_run(new_loc);
        API.storage.sync.set({ weather_loc: new_loc});
      }
    });
  }
});
