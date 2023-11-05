let API =  (navigator.userAgent.indexOf("Firefox") != -1) ? browser : chrome;

let cur_weather_location = {weather_location_str: "", weather_nx: 0, weather_ny: 0};
let weather_locations;
let coordinates_data = null;

async function fetch_weather_locations(val) {
    /*
        val을 포함하는 모든 위치 정보를 assets/KMA_forecast_coordinates.csv 파일에서 찾아와 배열에 저장해 리턴하는 함수.

        assets/KMA_forecast_coordinates.csv 파일은 다음 형식을 갖고 있다.
```
구분,행정구역코드,1단계,2단계,3단계,격자 X,격자 Y,경도(시),경도(분),경도(초),위도(시),위도(분),위도(초),경도(초/100),위도(초/100),위치업데이트,,,
kor,1111051500,서울특별시,종로구,청운효자동,60,127,126,58,14.35,37,35,2.89,126.9706519,37.5841367,,,,
```
        그리고 위치 정보는 위 field 중 "1단계", "2단계", "3단계" field에 있으며, 
        구체적으로 이 함수의 목표는 val의 값을 1단계, 2단계, 3단계 중 어느 하나의 field가 포함하는 모든 레코드를 찾고,
        그 레코드에서 "격자 X", "격자 Y" field의 값을 가져오는 것.

        리턴값은 구체적으로 다음과 같은 형식의 배열이 된다.
        1. 각 엘리먼트는 각 위치 정보를 담고 있다.
        2. 각 엘리먼트는 또 다른 배열이 되는데, 그 배열의 첫 번째 엘리먼트는 첫 번째 위치에 해당하는 한글 문자열. ("1단계 + 2단계 + 3단계"의 형식.)
           두 번째 엘리먼트는 "격자 X", "격자 Y" field의 값을 `/`라는 구분문자로 결합한 문자열.
        3. 검색 작업은 여태 찾은 엘리먼트가 10개가 넘어가면 중단하며, 마지막 엘리먼트의 첫 번째 엘리먼트의 값은 ...가 된다.

    */
    let data;
    if (!coordinates_data) {
        const response = await fetch('assets/KMA_forecast_coordinates.csv');
        data = await response.text();
    } else {
        data = coordinates_data;
    }

    const lines = data.split('\n');
    const results = [];
  
    for (const line of lines) {
        if (results.length >= 10) {
            results.push(['...', '...']);
            break;
        }
        const fields = line.split(',');
        const [region1, region2, region3, gridX, gridY] = [fields[2], fields[3], fields[4], fields[5], fields[6]];
    
        if (region1.includes(val) || region2.includes(val) || region3.includes(val)) {
            const locationString = `${region1} ${region2} ${region3}`.trim();
            const gridValue = `${gridX}/${gridY}`;
            results.push([locationString, gridValue]);
        }        
    }
  
    return results;
}

async function restoreOptions() {
    API.storage.sync.get(null, (items) => {
        if (items.weather_api)
            document.querySelector("#weather_api input").value = items.weather_api;
        if (items.weather_visibility)
            document.querySelector('#weather_visibility_checkbox').checked = items.weather_visibility;
        if (items.weather_location_str) {
            let option = document.createElement("option");
            option.value = items.weather_location_str;
            option.text = items.weather_location_str;
            cur_weather_location = {weather_location_str: items.weather_location_str, weather_nx: items.weather_nx, weather_ny: items.weather_ny};
            
            document.querySelector("#weather_location_combo").appendChild(option);
        }

        document.querySelector("#restore_backup textarea").value = JSON.stringify(items);
    });

    document.querySelector('#weather_visibility_checkbox').addEventListener('change', (event) => {
        API.storage.sync.set({weather_visibility: event.target.checked});
    });

    document.querySelector("#weather_api button").addEventListener("click", ()=>{
        API.storage.sync.set({weather_api: document.querySelector("#weather_api input").value});
    });

    document.querySelector("#weather_location input").addEventListener('change', async () => {
        weather_locations = await fetch_weather_locations(document.querySelector("#weather_location input").value);
        weather_locations.forEach((location_info) => {
            let option = document.createElement("option");
            option.value = location_info[1];
            option.text = location_info[0];
            document.querySelector("#weather_location_combo").appendChild(option);
        });
    });

    document.querySelector("#weather_location_combo").addEventListener("change", (e) => {
        if (e.target.text === "...") alert("Too many search results; Please use more specified keywords.");
        else {
            const {nx, ny} = e.target.value.split("/");
            cur_weather_location.weather_nx = nx;
            cur_weather_location.weather_ny = ny;
        }
    });

    document.querySelector("#weather_location button").addEventListener("click", ()=>{
        API.storage.sync.set(cur_weather_location);
    });
    
    document.querySelector("#restore_backup button").addEventListener("click", ()=>
    {
        try {
            if (document.querySelector("#restore_backup textarea").value.length > 100)
                API.storage.sync.set(JSON.parse(document.querySelector("#restore_backup textarea").value), ()=>{
                    window.location.href = window.location.href.split("?")[0];
                });
        }
        catch(e){
            console.log(e);
        }
    });
}






document.addEventListener('DOMContentLoaded', async()=>await restoreOptions());
