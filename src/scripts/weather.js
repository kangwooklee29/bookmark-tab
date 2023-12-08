let API =  (navigator.userAgent.indexOf("Firefox") != -1) ? browser : chrome;

async function displayWeather(weatherInfo) {
    const table = document.getElementById('weatherTable');
    table.innerHTML = '';

    // Time row with 'sepa' class
    const timeRow = document.createElement('tr');
    timeRow.className = 'time';
    const timeCell = document.createElement('td');
    timeCell.colSpan = 10;

    const timeDiv = document.createElement('div');
    weatherInfo.forEach((info, index) => {
      if (index === 10) return;
      const timeDivChild = document.createElement('div');
      timeDivChild.innerHTML = info.time;
      timeDiv.appendChild(timeDivChild);

      if (index !== 9) {
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
    for (key of ['icon', 'pop', 'pcp', 'tmp']) {
      const row = document.createElement('tr');
      for (let index = 0; index < weatherInfo.length; index++) {
        if (index === 10) break;
        let info  = weatherInfo[index];
        const cell = document.createElement('td');
        cell.innerHTML = info[key];
        if (key === 'icon') {
          const response = await fetch(info[key]);
          cell.innerHTML =  await response.text();
        }
        if (key === 'pcp') {
          if (info[key] === 0) {
            cell.innerHTML = "-";
          }
          else if (info['icon'].includes("snow"))
            cell.innerHTML = `${info[key] / 10}㎝`;
          else 
            cell.innerHTML += "㎜";
        }
        if (key === "tmp") cell.innerHTML += "℃";
        if (key === "pop") {
          if (index === 0)
            cell.innerHTML = "";
          else
            cell.innerHTML += "%";
        }
        row.appendChild(cell);
      }
      table.appendChild(row);
    }

}


async function fetch_weather_loc() {
  const ipResponse = await fetch('https://api64.ipify.org/?format=json');
  const ipData = await ipResponse.json();

  const locationResponse = await fetch(`https://ipapi.co/${ipData.ip}/json/`);
  const locData = await locationResponse.json();
  
  console.log(locData);
  return locData;
}


function fetch_and_run(items) {
  API.runtime.sendMessage( {greeting: "fetchWeather", weather_loc: {latitude: items.weather_loc.latitude, longitude: items.weather_loc.longitude}, weather_info_datetime: items.weather_info_datetime, weather_info: items.weather_info}, async function(response) {
    console.log("Response:", response);
    displayWeather(response.weather_info);
  });
}

API.storage.sync.get(['weather_info_datetime', 'weather_info', 'weather_loc'], async (items) => {
  let weather_loc = items.weather_loc;
  if (!items.weather_loc) {
    weather_loc = await fetch_weather_loc();
    fetch_and_run({weather_loc: weather_loc, weather_info: items.weather_info, weather_info_datetime: items.weather_info_datetime});
  } else {
    fetch_and_run({weather_loc: weather_loc, weather_info: items.weather_info, weather_info_datetime: items.weather_info_datetime});
    if (new Date().getTime() - items.weather_info_datetime <= 1000 * 60 * 60) return;
    const new_loc = await fetch_weather_loc();
    if (new_loc.latitude != weather_loc.latitude || new_loc.longitude != weather_loc.longitude) {
      document.getElementById('weatherTable').innerHTML = "";
      fetch_and_run({weather_loc: new_loc, weather_info: items.weather_info, weather_info_datetime: items.weather_info_datetime});
      API.storage.sync.set({ weather_loc: new_loc});
    }
  }
});
