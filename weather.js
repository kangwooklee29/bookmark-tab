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
        cell.innerHTML = info[key].replace("mm", "㎜").replace("cm", "㎝");
        if (key === "tmp") cell.innerHTML += "℃";
        if (key === "pop") cell.innerHTML += "%";
        row.appendChild(cell);
      });
      table.appendChild(row);
    });

}

API.storage.sync.get(['weather_info'], async (items) => {
  if (items.weather_info) {
    document.querySelector("#weatherTable").style.display = "none";
    const weather_info = items.weather_info;
    const currentDatetime = new Date().toISOString().slice(0, 13).replace('T', ' ');
    const intervalId = setInterval(() => {
      API.storage.sync.get(['weather_info_datetime'], (items) => {
          if (items.weather_info_datetime === currentDatetime) {
              clearInterval(intervalId);
              document.querySelector("#weatherTable").style.display = "block";
              run_weather(weather_info);
          }
      });
    }, 100);
  } else {
    window.location.href = "options.html?mode=setup";
  }
});
