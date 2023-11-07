let API =  (navigator.userAgent.indexOf("Firefox") != -1) ? browser : chrome;

async function restoreOptions() {
    API.storage.sync.get(null, (items) => {
        if (items.weather_visibility)
            document.querySelector('#weather_visibility_checkbox').checked = items.weather_visibility;
        document.querySelector("#restore_backup textarea").value = JSON.stringify(items);
    });

    document.querySelector('#location_consent button').addEventListener('click', () => {
        navigator.geolocation.getCurrentPosition(()=>{});
    });

    document.querySelector('#weather_visibility_checkbox').addEventListener('change', (event) => {
        API.storage.sync.set({weather_visibility: event.target.checked});
    });
    
    document.querySelector("#restore_backup button").addEventListener("click", ()=>
    {
        try {
            API.storage.sync.set(JSON.parse(document.querySelector("#restore_backup textarea").value), ()=>{
                window.location.href = window.location.href.split("?")[0];
            });
        }
        catch(e){
            console.log(e);
        }
    });
}

document.addEventListener('DOMContentLoaded', async ()=> {
    restoreOptions();
});

document.querySelector('#weather_visibility > label').textContent = chrome.i18n.getMessage("weather_visibility");
document.querySelector('#location_consent > label').textContent = chrome.i18n.getMessage("location_consent");
document.querySelector('#restore_backup > label').textContent = chrome.i18n.getMessage("restore_backup");
document.querySelector('#location_consent button').textContent = chrome.i18n.getMessage("click_to_ask");
document.querySelector('#restore_backup button').textContent = chrome.i18n.getMessage("restore");
