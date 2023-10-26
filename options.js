let API =  (navigator.userAgent.indexOf("Firefox") != -1) ? browser : chrome;

async function restoreOptions() {
    API.storage.sync.get(null, (items) => {
        if (items.weather_api)
            document.querySelector("#weather_api input").value = items.weather_api;
       
        document.querySelector("#restore_backup textarea").value = JSON.stringify(items);
    });


    document.querySelector("#weather_api button").addEventListener("click", ()=>{
        API.storage.sync.set({weather_api: document.querySelector("#weather_api input").value});
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
