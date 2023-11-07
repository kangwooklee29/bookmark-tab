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

const date = new Date();
const offset = date.getTimezoneOffset() * 60000;
const current_datetime = (new Date(date - offset)).toISOString().slice(0, 13);

API.storage.sync.get(null, async (items) => {
  console.log(items);
  if (items.weather_info) {
    document.querySelector("#weatherTable").style.display = "none";
    if (items.weather_info_datetime !== current_datetime) {
      API.runtime.sendMessage({greeting: "fetchWeather"}, function(response) {
        console.log("Response:", response);
        document.querySelector("#weatherTable").style.display = "block";
        API.storage.sync.get(null, async (items) => {
          run_weather(items.weather_info);
        });
      });
    } else {
      document.querySelector("#weatherTable").style.display = "block";
      run_weather(items.weather_info);  
    }
  } else {
    window.location.href = "options.html?mode=setup";
  }
});
